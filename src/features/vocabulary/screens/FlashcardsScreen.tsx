import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllStoredWords, StoredWord } from '../../../services/storage/wordStorage';
import SpeakButton from '../components/SpeakButton';
import { isDue, previewIntervals, recordReview } from '../services/reviewService';
import { Lang, UserWordState, Word, wordLang } from '../types/word';
import { Grade, GRADES } from '../../../core/srs/sm2';
import { displayGroups, posLabel } from '../utils/partOfSpeech';
import { useSettings, useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import type { TFunction, TKey } from '../../../i18n/strings';

/**
 * Kart çevirme (flashcard) ile ezber.
 * - Ön yüz: kelime. Dokununca döner, arka yüzde çeviriler + örnek cümle.
 * - Arka yüzde 4 düğme (SM-2): Bilmadim / Qiyin / Yaxshi / Oson.
 *   Altlarında bir sonraki tekrarın ne zaman olacağı yazar.
 * - "Bilmadim" denen kart oturumun sonuna tekrar eklenir; bilinene kadar döner.
 * - Kelimenin tekrar takvimine (reviewService) sadece İLK cevap işlenir.
 */

type Deck = 'due' | 'favorites' | 'all';
type Side = 'word' | 'translation';

const SESSION_SIZE = 15;
const DECKS: { key: Deck; label: TKey }[] = [
  { key: 'due', label: 'cards.due' },
  { key: 'favorites', label: 'cards.favorites' },
  { key: 'all', label: 'cards.all' },
];

const GRADE_LABEL: Record<Grade, TKey> = {
  again: 'cards.again',
  hard: 'cards.hard',
  good: 'cards.good',
  easy: 'cards.easy',
};

/** 0 → "10 daq", 3 → "3 kun", 45 → "2 oy" */
export function formatInterval(days: number, t: TFunction): string {
  if (days <= 0) {
    return t('srs.minutes', { n: 10 });
  }
  if (days < 30) {
    return t('srs.days', { n: Math.round(days) });
  }
  if (days < 365) {
    return t('srs.months', { n: Math.round(days / 30) });
  }
  return t('srs.years', { n: Math.round((days / 365) * 10) / 10 });
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function pickDeck(all: StoredWord[], deck: Deck): Word[] {
  const now = new Date();
  let list = all;
  if (deck === 'due') {
    list = all.filter(x => isDue(x.state, now));
  } else if (deck === 'favorites') {
    list = all.filter(x => x.state.isFavorite);
  }
  return shuffle(list.map(x => x.word)).slice(0, SESSION_SIZE);
}

export default function FlashcardsScreen() {
  const s = useStyles();
  const t = useT();
  const [deck, setDeck] = useState<Deck>('due');
  const [front, setFront] = useState<Side>('word');
  const [queue, setQueue] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<Word[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const answered = useRef(new Set<string>()); // ilk cevabı verilmiş kartlar
  const states = useRef(new Map<string, UserWordState>()); // aralık önizlemesi için
  const flip = useRef(new Animated.Value(0)).current;

  const start = useCallback(async (d: Deck) => {
    const all = await getAllStoredWords();
    states.current = new Map(all.map(x => [x.word.id, x.state]));
    const words = pickDeck(all, d);
    answered.current = new Set();
    flip.setValue(0);
    setFlipped(false);
    setQueue(words);
    setTotal(words.length);
    setKnown(0);
    setMissed([]);
    setLoaded(true);
  }, [flip]);

  useFocusEffect(
    useCallback(() => {
      start(deck);
    }, [start, deck]),
  );

  const cur = queue[0];

  const toggleFlip = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    setFlipped(f => !f);
  };

  const answer = async (grade: Grade) => {
    if (!cur) {
      return;
    }
    const ok = grade !== 'again';
    if (!answered.current.has(cur.id)) {
      answered.current.add(cur.id);
      const updated = await recordReview(cur.id, grade);
      if (updated) {
        states.current.set(cur.id, updated.state);
      }
      if (ok) {
        setKnown(k => k + 1);
      } else {
        setMissed(m => [...m, cur]);
      }
    }
    flip.setValue(0);
    setFlipped(false);
    // "Bilmadim" denen kart sıranın sonuna döner
    setQueue(q => (ok ? q.slice(1) : [...q.slice(1), q[0]]));
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const progress = total ? (total - queue.length) / total : 0;

  const header = (
    <View>
      <View style={s.segment}>
        {DECKS.map(d => (
          <Pressable key={d.key} style={[s.segBtn, deck === d.key && s.segActive]} onPress={() => setDeck(d.key)}>
            <Text style={[s.segText, deck === d.key && s.segTextActive]}>{t(d.label)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={s.dirBtn} onPress={() => setFront(f => (f === 'word' ? 'translation' : 'word'))}>
        <Text style={s.dirText}>{t(front === 'word' ? 'cards.frontWord' : 'cards.frontTrans')}</Text>
      </Pressable>
    </View>
  );

  if (!loaded) {
    return <SafeAreaView style={s.c} />;
  }

  // Oturum bitti
  if (!cur) {
    const empty = total === 0;
    return (
      <SafeAreaView style={s.c}>
        <ScrollView contentContainerStyle={s.p}>
          {header}
          <View style={s.done}>
            {empty ? (
              <>
                <Text style={s.doneTitle}>{t('cards.emptyTitle')}</Text>
                <Text style={s.doneSub}>
                  {t(deck === 'due' ? 'cards.emptyDue' : deck === 'favorites' ? 'cards.emptyFav' : 'cards.emptyAll')}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.doneTitle}>{t('cards.done')}</Text>
                <Text style={s.score}>
                  {known} / {total}
                </Text>
                <Text style={s.doneSub}>{t('cards.firstTry')}</Text>
                {missed.length > 0 && (
                  <View style={s.missedBox}>
                    <Text style={s.missedTitle}>{t('cards.keepPracticing')}</Text>
                    {missed.map(m => (
                      <Text key={m.id} style={s.missedRow}>
                        <Text style={{ fontWeight: '700' }}>{m.word}</Text> — {m.translations.join(', ')}
                      </Text>
                    ))}
                  </View>
                )}
                <Pressable style={s.primary} onPress={() => start(deck)}>
                  <Text style={s.primaryText}>{t('cards.startAgain')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <ScrollView contentContainerStyle={s.p}>
        {header}
        <View style={s.progressRow}>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={s.progressText}>
            {total - queue.length} / {total}
          </Text>
        </View>

        <Pressable onPress={toggleFlip} accessibilityRole="button" accessibilityHint={t('cards.tapToFlip')}>
          <View style={s.cardArea}>
            <Animated.View
              pointerEvents={flipped ? 'none' : 'auto'}
              style={[s.card, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
              <CardFace word={cur} side={front} />
              <Text style={s.hint}>{t('cards.tapToFlip')}</Text>
            </Animated.View>
            <Animated.View
              pointerEvents={flipped ? 'auto' : 'none'}
              style={[s.card, s.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
              <CardFace word={cur} side={front === 'word' ? 'translation' : 'word'} detailed />
            </Animated.View>
          </View>
        </Pressable>

        {flipped ? (
          <GradeButtons state={states.current.get(cur.id)} onGrade={answer} />
        ) : (
          <Pressable style={s.primary} onPress={toggleFlip}>
            <Text style={s.primaryText}>{t('cards.showAnswer')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** SM-2 düğmeleri: her birinin altında bir sonraki tekrar zamanı */
function GradeButtons({ state, onGrade }: { state?: UserWordState; onGrade: (g: Grade) => void }) {
  const s = useStyles();
  const { t, colors } = useSettings();
  const ivl = state ? previewIntervals(state) : null;
  const bg: Record<Grade, string> = {
    again: colors.danger,
    hard: colors.warning,
    good: colors.success,
    easy: colors.primary,
  };
  return (
    <View>
      <Text style={s.gradeHint}>{t('cards.gradeHint')}</Text>
      <View style={s.answerRow}>
        {GRADES.map(g => (
          <Pressable
            key={g}
            style={[s.answerBtn, { backgroundColor: bg[g] }]}
            onPress={() => onGrade(g)}
            accessibilityRole="button">
            <Text style={s.answerText} numberOfLines={1} adjustsFontSizeToFit>
              {t(GRADE_LABEL[g])}
            </Text>
            {ivl && <Text style={s.answerSub}>{formatInterval(ivl[g], t)}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Kartın bir yüzü: kelime tarafı ya da çeviri tarafı */
function CardFace({ word, side, detailed }: { word: Word; side: Side; detailed?: boolean }) {
  const s = useStyles();
  const t = useT();
  const lang = wordLang(word);
  const other: Lang = lang === 'en' ? 'uz' : 'en';
  const groups = useMemo(() => displayGroups(word), [word]);
  const ex = word.examples?.[0];

  if (side === 'word') {
    return (
      <View style={s.face}>
        <Text style={s.bigWord}>{word.word}</Text>
        {word.pronunciation && <Text style={s.ipa}>{word.pronunciation}</Text>}
        <View style={{ marginTop: spacing.md }}>
          <SpeakButton text={word.word} lang={lang} audioUrl={word.audioUrl} size={44} />
        </View>
        {detailed && ex && (
          <Text style={s.example}>“{lang === 'uz' ? ex.uz : ex.en}”</Text>
        )}
      </View>
    );
  }

  return (
    <View style={s.face}>
      {groups.map((g, i) => (
        <View key={i} style={s.groupRow}>
          {g.pos && <Text style={s.pos}>{posLabel(g.pos, t)}</Text>}
          <Text style={s.transText}>{g.translations.join(', ')}</Text>
        </View>
      ))}
      <View style={{ marginTop: spacing.md }}>
        <SpeakButton text={word.translations[0] ?? ''} lang={other} size={40} />
      </View>
      {detailed && ex && (
        <Text style={s.example}>“{lang === 'uz' ? ex.en : ex.uz}”</Text>
      )}
    </View>
  );
}

const CARD_H = 320;

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: c.border },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segActive: { backgroundColor: c.surface },
  segText: { fontWeight: '600', color: c.textSecondary },
  segTextActive: { color: c.primary },
  dirBtn: { marginTop: spacing.sm, alignSelf: 'center', padding: spacing.xs },
  dirText: { color: c.primary, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 8 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: c.primary },
  progressText: { color: c.textSecondary, fontVariant: ['tabular-nums'] },
  cardArea: { height: CARD_H, marginTop: spacing.lg },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: { borderColor: c.primary },
  face: { alignItems: 'center' },
  bigWord: { fontSize: 38, fontWeight: '700', color: c.text, textAlign: 'center' },
  ipa: { marginTop: spacing.xs, fontSize: 16, color: c.textSecondary },
  groupRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  pos: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
    borderWidth: 1,
    borderColor: c.border,
    textTransform: 'uppercase',
  },
  transText: { fontSize: 24, fontWeight: '700', color: c.success, textAlign: 'center' },
  example: { marginTop: spacing.md, fontStyle: 'italic', color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  hint: { position: 'absolute', bottom: 12, alignSelf: 'center', fontSize: 12, color: c.textSecondary },
  primary: { marginTop: spacing.lg, padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  primaryText: { color: c.white, fontWeight: '700', fontSize: 16 },
  gradeHint: { marginTop: spacing.lg, textAlign: 'center', color: c.textSecondary },
  answerRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  answerBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center' },
  answerText: { color: c.white, fontWeight: '700', fontSize: 15 },
  answerSub: { marginTop: 2, color: c.white, fontSize: 12, opacity: 0.9 },
  done: { alignItems: 'center', marginTop: spacing.xl },
  doneTitle: { fontSize: 26, fontWeight: '700', color: c.text, textAlign: 'center' },
  doneSub: { marginTop: spacing.sm, color: c.textSecondary, textAlign: 'center' },
  score: { marginTop: spacing.md, fontSize: 48, fontWeight: '700', color: c.primary },
  missedBox: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  missedTitle: { fontWeight: '700', color: c.text, marginBottom: 6 },
  missedRow: { marginTop: 4, color: c.text },
}));
