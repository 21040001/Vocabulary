import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../../../app/settings/SettingsContext';
import { getAllStoredWords, getStoredWordIds, saveWords } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import SpeakButton from '../components/SpeakButton';
import { getFrequentWords } from '../services/dictionaryService';
import { isDue, recordReview } from '../services/reviewService';
import { Lang, Word, wordLang } from '../types/word';
import { isAnswerCorrect } from '../utils/answerUtils';

const SIZE = 5;
const NEW_WORDS_BATCH = 5;

export default function QuizScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const [w, setW] = useState<Word[]>([]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState('');
  const [shown, setShown] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState<boolean | null>(null);
  const [missed, setMissed] = useState<Word[]>([]);
  const [done, setDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<'noNew' | 'unavailable' | null>(null);

  const load = async () => {
    const now = new Date();
    const a = (await getAllStoredWords())
      .filter(x => isDue(x.state, now))
      .map(x => x.word)
      .slice(0, SIZE);
    setW(a);
    setI(0);
    setCorrect(0);
    setAnswer('');
    setShown(false);
    setAutoCorrect(null);
    setMissed([]);
    setDone(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  /** Sözlükten en sık kullanılan, henüz kayıtlı olmayan kelimeleri ekler. */
  const addNewWords = async (lang: Lang) => {
    try {
      setAdding(true);
      setAddError(null);
      const words = await getFrequentWords(lang, NEW_WORDS_BATCH, await getStoredWordIds());
      if (!words.length) {
        setAddError('noNew');
        return;
      }
      await saveWords(words);
      await load();
    } catch (e) {
      console.warn('[quiz] addNewWords', e);
      setAddError('unavailable');
    } finally {
      setAdding(false);
    }
  };

  const cur = w[i];

  const finish = async (ok: boolean) => {
    if (!cur) {
      return;
    }
    await recordReview(cur.id, ok);
    if (ok) {
      setCorrect(x => x + 1);
    } else {
      setMissed(x => [...x, cur]);
    }
    if (i >= w.length - 1) {
      setDone(true);
      return;
    }
    setI(x => x + 1);
    setAnswer('');
    setShown(false);
    setAutoCorrect(null);
  };

  const newWordsButtons = (
    <View style={{ width: '100%', marginTop: 24 }}>
      <Pressable style={s.button} onPress={() => addNewWords('en')} disabled={adding}>
        <Text style={s.bt}>{t('quiz.addEnUz', { n: NEW_WORDS_BATCH })}</Text>
      </Pressable>
      <Pressable style={[s.button, s.secondary]} onPress={() => addNewWords('uz')} disabled={adding}>
        <Text style={s.btSecondary}>{t('quiz.addUzEn', { n: NEW_WORDS_BATCH })}</Text>
      </Pressable>
      {adding && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
      {addError && (
        <Text style={s.errorText}>{t(addError === 'noNew' ? 'quiz.noNewWords' : 'quiz.dictUnavailable')}</Text>
      )}
    </View>
  );

  if (done) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.result}>
          <Text style={s.title}>{t('quiz.complete')}</Text>
          <Text style={s.score}>
            {correct} / {w.length}
          </Text>
          <Text style={s.acc}>{t('quiz.accuracy', { n: w.length ? Math.round((correct / w.length) * 100) : 0 })}</Text>
          {missed.length > 0 && (
            <View style={{ width: '100%', marginTop: 24 }}>
              <Text style={s.st}>{t('quiz.toReview')}</Text>
              {missed.map(x => (
                <View style={s.missed} key={x.id}>
                  <Text style={s.mw}>{x.word}</Text>
                  <Text style={s.mt}>{x.translations.join(', ')}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable style={s.button} onPress={load}>
            <Text style={s.bt}>{t('quiz.again')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!cur) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.result}>
          <Text style={s.title}>{t('quiz.noWords')}</Text>
          <Text style={s.acc}>{t('quiz.noWordsHint')}</Text>
          {newWordsButtons}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <View style={s.p}>
        <View style={s.top}>
          <Text style={s.counter}>
            {i + 1} / {w.length}
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.question}>{t('quiz.question')}</Text>
          <Text style={s.word}>{cur.word}</Text>
          {cur.pronunciation && <Text style={s.sub}>{cur.pronunciation}</Text>}
          <View style={{ marginTop: 12 }}>
            <SpeakButton text={cur.word} lang={wordLang(cur)} audioUrl={cur.audioUrl} />
          </View>
          <TextInput
            style={s.input}
            placeholder={t(wordLang(cur) === 'en' ? 'quiz.typeUz' : 'quiz.typeEn')}
            placeholderTextColor={colors.textSecondary}
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!shown}
          />
          {!shown && (
            <Pressable
              style={s.button}
              onPress={() => {
                if (answer.trim()) {
                  setAutoCorrect(isAnswerCorrect(answer, cur.translations));
                  setShown(true);
                }
              }}>
              <Text style={s.bt}>{t('quiz.check')}</Text>
            </Pressable>
          )}
          {shown && (
            <>
              <Text style={autoCorrect ? s.good : s.bad}>{autoCorrect ? t('quiz.correct') : t('quiz.notQuite')}</Text>
              <Text style={s.trans}>{cur.translations.join(', ')}</Text>
              <View style={s.buttons}>
                <Pressable style={[s.ans, s.wrong]} onPress={() => finish(false)}>
                  <Text style={s.bt}>{t('quiz.wrongBtn')}</Text>
                </Pressable>
                <Pressable style={[s.ans, s.right]} onPress={() => finish(true)}>
                  <Text style={s.bt}>{t('quiz.correctBtn')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { flex: 1, padding: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  counter: { color: c.textSecondary, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', color: c.text, textAlign: 'center' },
  card: {
    marginTop: 24,
    padding: 24,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  question: { color: c.textSecondary },
  word: { marginTop: 24, fontSize: 36, fontWeight: '700', color: c.text, textAlign: 'center' },
  sub: { marginTop: 8, color: c.textSecondary },
  input: {
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    color: c.text,
    backgroundColor: c.background,
  },
  button: { marginTop: 16, width: '100%', padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary },
  bt: { color: c.white, fontWeight: '600' },
  btSecondary: { color: c.primary, fontWeight: '600' },
  errorText: { marginTop: 12, color: c.danger, textAlign: 'center' },
  good: { marginTop: 16, color: c.success, fontSize: 18, fontWeight: '700' },
  bad: { marginTop: 16, color: c.danger, fontSize: 18, fontWeight: '700' },
  trans: { marginTop: 8, fontSize: 22, fontWeight: '600', color: c.success, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8, width: '100%' },
  ans: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  wrong: { backgroundColor: c.danger },
  right: { backgroundColor: c.success },
  result: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 52, fontWeight: '700', color: c.primary, marginTop: 24 },
  acc: { fontSize: 18, color: c.textSecondary, marginTop: 12, textAlign: 'center' },
  st: { fontSize: 18, fontWeight: '700', color: c.text },
  missed: {
    width: '100%',
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  mw: { fontWeight: '700', fontSize: 16, marginBottom: 4, color: c.text },
  mt: { color: c.textSecondary },
}));
