import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import SpeakButton from '../../vocabulary/components/SpeakButton';
import { recordReview } from '../../vocabulary/services/reviewService';
import NeedWords from '../components/NeedWords';
import OptionButton, { OptionState } from '../components/OptionButton';
import SessionSummary, { MissedItem } from '../components/SessionSummary';
import { getOptionPool, getSessionWords } from '../services/practiceData';
import { BlankQuestion, buildBlankQuestion, buildChoiceQuestion, shuffle } from '../utils/questions';

const SESSION_SIZE = 10;

type Q = BlankQuestion & { options: string[] };

/**
 * Boşluk doldurma: sözlükteki (Tatoeba) örnek cümlede İngilizce kelime boş bırakılır,
 * 4 şıktan doğrusu seçilir. Özbekçe cümle ipucu olarak açılabilir.
 */
export default function FillBlankScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<MissedItem[]>([]);

  const load = useCallback(async () => {
    setQuestions(null);
    // Örnek cümlesi olan kelimeler
    const { session, all } = await getSessionWords(50, w => !!w.examples?.length);
    const qs: Q[] = [];
    for (const w of session) {
      const b = buildBlankQuestion(w);
      if (!b) {
        continue;
      }
      // Şıklar İngilizce sözlük hâlinde: doğru = b.base
      const fake = { ...w, word: b.base, translations: [b.base] };
      const choice = buildChoiceQuestion(fake, await getOptionPool('en', all.filter(x => x.id !== w.id), fake));
      if (choice) {
        qs.push({ ...b, options: choice.options });
      }
      if (qs.length === SESSION_SIZE) {
        break;
      }
    }
    setQuestions(shuffle(qs));
    setI(0);
    setPicked(null);
    setHint(false);
    setScore(0);
    setMissed([]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
  const cur = questions[i];
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
    const ok = opt === cur.base;
    if (ok) {
      setScore(x => x + 1);
    } else {
      setMissed(m => [...m, { id: cur.word.id, left: cur.base, right: cur.sentence.replace('_____', cur.answer) }]);
    }
    await recordReview(cur.word.id, ok);
  };

  const stateOf = (opt: string): OptionState =>
    !picked ? 'idle' : opt === cur.base ? 'correct' : opt === picked ? 'wrong' : 'dimmed';

  const full = cur.sentence.replace('_____', cur.answer);
  const [before, after] = cur.sentence.split('_____');

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
        <Text style={s.label}>{t('practice.fillPrompt')}</Text>
        <Text style={s.sentence}>
          {before}
          <Text style={picked ? s.filled : s.blank}>{picked ? cur.answer : '_____'}</Text>
          {after}
        </Text>
        {picked && (
          <View style={{ marginTop: spacing.sm }}>
            <SpeakButton text={full} lang="en" size={36} />
          </View>
        )}
        {hint || picked ? (
          <Text style={s.hint}>{cur.hint}</Text>
        ) : (
          <Pressable onPress={() => setHint(true)} hitSlop={8}>
            <Text style={s.hintBtn}>{t('practice.showHint')}</Text>
          </Pressable>
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
            setHint(false);
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
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  label: { color: c.textSecondary },
  sentence: { marginTop: spacing.md, fontSize: 22, lineHeight: 32, color: c.text, textAlign: 'center' },
  blank: { color: c.primary, fontWeight: '700' },
  filled: { color: c.success, fontWeight: '700', textDecorationLine: 'underline' },
  hint: { marginTop: spacing.md, fontStyle: 'italic', color: c.textSecondary, textAlign: 'center' },
  hintBtn: { marginTop: spacing.md, color: c.primary, fontWeight: '600' },
  next: { marginTop: spacing.lg, padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  nextText: { color: c.white, fontWeight: '700', fontSize: 16 },
}));
