import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllStoredWords, StoredWord } from '../../../services/storage/wordStorage';
import SpeakButton from '../components/SpeakButton';
import { recordReview } from '../services/reviewService';
import { Lang, Word, wordLang } from '../types/word';
import { displayGroups, posLabel } from '../utils/partOfSpeech';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Deck = 'due' | 'favorites' | 'all';
type Side = 'word' | 'translation';

const SESSION_SIZE = 15;
const DECKS: { key: Deck; label: string }[] = [
  { key: 'due', label: 'To review' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'all', label: 'All' },
];

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
    list = all.filter(
      x =>
        x.state.learningStatus !== 'mastered' &&
        (!x.state.nextReviewAt || new Date(x.state.nextReviewAt) <= now),
    );
  } else if (deck === 'favorites') {
    list = all.filter(x => x.state.isFavorite);
  }
  return shuffle(list.map(x => x.word)).slice(0, SESSION_SIZE);
}

export default function FlashcardsScreen() {
  const [deck, setDeck] = useState<Deck>('due');
  const [front, setFront] = useState<Side>('word');
  const [queue, setQueue] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<Word[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const answered = useRef(new Set<string>());
  const flip = useRef(new Animated.Value(0)).current;

  const start = useCallback(async (d: Deck) => {
    const words = pickDeck(await getAllStoredWords(), d);
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

  const answer = async (ok: boolean) => {
    if (!cur) {
      return;
    }
    if (!answered.current.has(cur.id)) {
      answered.current.add(cur.id);
      await recordReview(cur.id, ok);
      if (ok) {
        setKnown(k => k + 1);
      } else {
        setMissed(m => [...m, cur]);
      }
    }
    flip.setValue(0);
    setFlipped(false);
    // Bilinmeyen kart sıranın sonuna döner
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
            <Text style={[s.segText, deck === d.key && s.segTextActive]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={s.dirBtn} onPress={() => setFront(f => (f === 'word' ? 'translation' : 'word'))}>
        <Text style={s.dirText}>
          Front side: {front === 'word' ? 'word → translation' : 'translation → word'} ⇄
        </Text>
      </Pressable>
    </View>
  );

  if (!loaded) {
    return <SafeAreaView style={s.c} />;
  }

  if (!cur) {
    const empty = total === 0;
    return (
      <SafeAreaView style={s.c}>
        <ScrollView contentContainerStyle={s.p}>
          {header}
          <View style={s.done}>
            {empty ? (
              <>
                <Text style={s.doneTitle}>No cards here</Text>
                <Text style={s.doneSub}>
                  {deck === 'due'
                    ? 'Nothing to review right now. Try "All", or add new words in Quiz.'
                    : deck === 'favorites'
                    ? 'Mark words with ♥ to study them here.'
                    : 'Search words or add new words in Quiz first.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.doneTitle}>Session complete 🎉</Text>
                <Text style={s.score}>
                  {known} / {total}
                </Text>
                <Text style={s.doneSub}>known on first try</Text>
                {missed.length > 0 && (
                  <View style={s.missedBox}>
                    <Text style={s.missedTitle}>Keep practicing</Text>
                    {missed.map(m => (
                      <Text key={m.id} style={s.missedRow}>
                        <Text style={{ fontWeight: '700' }}>{m.word}</Text> — {m.translations.join(', ')}
                      </Text>
                    ))}
                  </View>
                )}
                <Pressable style={s.primary} onPress={() => start(deck)}>
                  <Text style={s.primaryText}>Start again</Text>
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

        <Pressable onPress={toggleFlip} accessibilityRole="button" accessibilityHint="Flip the card">
          <View style={s.cardArea}>
            <Animated.View
              pointerEvents={flipped ? 'none' : 'auto'}
              style={[s.card, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
              <CardFace word={cur} side={front} />
              <Text style={s.hint}>Tap to flip</Text>
            </Animated.View>
            <Animated.View
              pointerEvents={flipped ? 'auto' : 'none'}
              style={[s.card, s.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
              <CardFace word={cur} side={front === 'word' ? 'translation' : 'word'} detailed />
            </Animated.View>
          </View>
        </Pressable>

        {flipped ? (
          <View style={s.answerRow}>
            <Pressable style={[s.answerBtn, s.bad]} onPress={() => answer(false)}>
              <Text style={s.answerText}>✕ Didn't know</Text>
            </Pressable>
            <Pressable style={[s.answerBtn, s.good]} onPress={() => answer(true)}>
              <Text style={s.answerText}>✓ Knew it</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.primary} onPress={toggleFlip}>
            <Text style={s.primaryText}>Show answer</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CardFace({ word, side, detailed }: { word: Word; side: Side; detailed?: boolean }) {
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
        {detailed && ex && <Text style={s.example}>“{lang === 'uz' ? ex.uz : ex.en}”</Text>}
      </View>
    );
  }

  return (
    <View style={s.face}>
      {groups.map((g, i) => (
        <View key={i} style={s.groupRow}>
          {g.pos && <Text style={s.pos}>{posLabel(g.pos)}</Text>}
          <Text style={s.transText}>{g.translations.join(', ')}</Text>
        </View>
      ))}
      <View style={{ marginTop: spacing.md }}>
        <SpeakButton text={word.translations[0] ?? ''} lang={other} size={40} />
      </View>
      {detailed && ex && <Text style={s.example}>“{lang === 'uz' ? ex.en : ex.uz}”</Text>}
    </View>
  );
}

const CARD_H = 320;

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  p: { padding: spacing.lg },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: colors.border },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segActive: { backgroundColor: colors.surface },
  segText: { fontWeight: '600', color: colors.textSecondary },
  segTextActive: { color: colors.primary },
  dirBtn: { marginTop: spacing.sm, alignSelf: 'center', padding: spacing.xs },
  dirText: { color: colors.primary, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 8 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary },
  progressText: { color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  cardArea: { height: CARD_H, marginTop: spacing.lg },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: { borderColor: colors.primary },
  face: { alignItems: 'center' },
  bigWord: { fontSize: 38, fontWeight: '700', color: colors.text, textAlign: 'center' },
  ipa: { marginTop: spacing.xs, fontSize: 16, color: colors.textSecondary },
  groupRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  pos: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    textTransform: 'uppercase',
  },
  transText: { fontSize: 24, fontWeight: '700', color: colors.success, textAlign: 'center' },
  example: { marginTop: spacing.md, fontStyle: 'italic', color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  hint: { position: 'absolute', bottom: 12, alignSelf: 'center', fontSize: 12, color: colors.textSecondary },
  primary: { marginTop: spacing.lg, padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  answerRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  answerBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  bad: { backgroundColor: '#DC2626' },
  good: { backgroundColor: colors.success },
  answerText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  done: { alignItems: 'center', marginTop: spacing.xl },
  doneTitle: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  doneSub: { marginTop: spacing.sm, color: colors.textSecondary, textAlign: 'center' },
  score: { marginTop: spacing.md, fontSize: 48, fontWeight: '700', color: colors.primary },
  missedBox: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missedTitle: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  missedRow: { marginTop: 4, color: colors.text },
});