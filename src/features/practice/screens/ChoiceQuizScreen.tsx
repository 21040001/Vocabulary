import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useSettings } from '../../../app/settings/SettingsContext';
import { pronounce } from '../../../services/speech/speech';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import SpeakButton from '../../vocabulary/components/SpeakButton';
import { recordReview } from '../../vocabulary/services/reviewService';
import { Lang, wordLang } from '../../vocabulary/types/word';
import NeedWords from '../components/NeedWords';
import OptionButton, { OptionState } from '../components/OptionButton';
import SessionSummary, { MissedItem } from '../components/SessionSummary';
import { getOptionPool, getSessionWords } from '../services/practiceData';
import { buildChoiceQuestion, ChoiceQuestion } from '../utils/questions';

const SESSION_SIZE = 10;

/**
 * Çoktan seçmeli quiz.
 *  mode 'read'  : kelime yazılı gösterilir, doğru çeviri seçilir
 *  mode 'listen': kelime sadece SESLİ okunur (yalnız İngilizce kelimeler), anlamı seçilir
 */
export default function ChoiceQuizScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const { mode } = useRoute<RouteProp<RootStackParamList, 'ChoiceQuiz'>>().params;
  const listen = mode === 'listen';

  const [questions, setQuestions] = useState<ChoiceQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<MissedItem[]>([]);

  const load = useCallback(async () => {
    setQuestions(null);
    const { session, all } = await getSessionWords(SESSION_SIZE, w => !listen || wordLang(w) === 'en');
    const qs: ChoiceQuestion[] = [];
    for (const w of session) {
      const target: Lang = wordLang(w) === 'en' ? 'uz' : 'en';
      const q = buildChoiceQuestion(w, await getOptionPool(target, all, w));
      if (q) {
        qs.push(q);
      }
    }
    setQuestions(qs);
    setI(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
  }, [listen]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cur = questions?.[i];

  // Dinleme modunda her yeni soruda kelimeyi otomatik oku
  useEffect(() => {
    if (listen && cur) {
      pronounce(cur.word.word, 'en', cur.word.audioUrl).catch(() => undefined);
    }
  }, [listen, cur]);

  if (!questions) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!questions.length) {
    return <NeedWords />;
  }
  if (!cur) {
    return (
      <SessionSummary
        title={t('cards.done')}
        score={score}
        total={questions.length}
        subtitle={t('practice.correctOf')}
        missed={missed}
        onAgain={load}
      />
    );
  }

  const answer = async (opt: string) => {
    if (picked) {
      return;
    }
    setPicked(opt);
    const ok = opt === cur.correct;
    if (ok) {
      setScore(x => x + 1);
    } else {
      setMissed(m => [...m, { id: cur.word.id, left: cur.word.word, right: cur.correct }]);
    }
    await recordReview(cur.word.id, ok);
  };

  const stateOf = (opt: string): OptionState => {
    if (!picked) {
      return 'idle';
    }
    if (opt === cur.correct) {
      return 'correct';
    }
    return opt === picked ? 'wrong' : 'dimmed';
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <View style={s.progressRow}>
        <View style={s.bar}>
          <View style={[s.fill, { width: `${Math.round((i / questions.length) * 100)}%` }]} />
        </View>
        <Text style={s.counter}>
          {i + 1} / {questions.length}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.label}>{listen ? t('practice.whatHeard') : t('practice.chooseTranslation')}</Text>
        {listen && !picked ? (
          <Pressable
            style={s.play}
            onPress={() => pronounce(cur.word.word, 'en', cur.word.audioUrl).catch(() => undefined)}
            accessibilityLabel={t('practice.playAgain')}>
            <Text style={s.playIcon}>🔊</Text>
            <Text style={s.playText}>{t('practice.playAgain')}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={s.word}>{cur.prompt}</Text>
            {cur.word.pronunciation && <Text style={s.ipa}>{cur.word.pronunciation}</Text>}
            {!listen && (
              <View style={{ marginTop: spacing.sm }}>
                <SpeakButton text={cur.word.word} lang={wordLang(cur.word)} audioUrl={cur.word.audioUrl} />
              </View>
            )}
          </>
        )}
      </View>

      {cur.options.map(opt => (
        <OptionButton key={opt} label={opt} state={stateOf(opt)} onPress={() => answer(opt)} disabled={!!picked} />
      ))}

      {picked && (
        <Pressable
          style={s.next}
          onPress={() => {
            setPicked(null);
            setI(x => x + 1);
          }}>
          <Text style={s.nextText}>{t('pron.next')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: c.primary },
  counter: { color: c.textSecondary, fontWeight: '600' },
  card: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    minHeight: 170,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: c.textSecondary },
  word: { marginTop: spacing.sm, fontSize: 34, fontWeight: '700', color: c.text, textAlign: 'center' },
  ipa: { marginTop: 4, color: c.textSecondary },
  play: {
    marginTop: spacing.md,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 38 },
  playText: { marginTop: 2, fontSize: 11, color: c.white, fontWeight: '600', textAlign: 'center' },
  next: { marginTop: spacing.lg, padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  nextText: { color: c.white, fontWeight: '700', fontSize: 16 },
}));
