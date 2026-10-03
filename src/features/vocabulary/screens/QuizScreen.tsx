import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { getAllStoredWords, getStoredWordIds, saveWords } from '../../../services/storage/wordStorage';
import { getFrequentWords } from '../services/dictionaryService';
import { recordReview } from '../services/reviewService';
import { isAnswerCorrect } from '../utils/answerUtils';
import { Lang, Word, wordLang } from '../types/word';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import SpeakButton from '../components/SpeakButton';

const SIZE = 5;
const NEW_WORDS_BATCH = 5;

export default function QuizScreen() {
  const [w, setW] = useState<Word[]>([]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState('');
  const [shown, setShown] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState<boolean | null>(null);
  const [missed, setMissed] = useState<Word[]>([]);
  const [done, setDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const load = async () => {
    const now = new Date();
    const a = (await getAllStoredWords())
      .filter(
        x =>
          x.state.learningStatus !== 'mastered' &&
          (!x.state.nextReviewAt || new Date(x.state.nextReviewAt) <= now),
      )
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
        setAddError('No new words left in the dictionary.');
        return;
      }
      await saveWords(words);
      await load();
    } catch (e) {
      console.warn('[quiz] addNewWords', e);
      setAddError('Dictionary is not available.');
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

    const flashcardsButton = (
    <View style={s.modes}>
      <Pressable style={s.cardsBtn} onPress={() => nav.navigate('Flashcards')}>
        <Text style={s.cardsBtnText}>🃏 Cards</Text>
      </Pressable>
      <Pressable style={s.cardsBtn} onPress={() => nav.navigate('Pronunciation')}>
        <Text style={s.cardsBtnText}>🎤 Speak</Text>
      </Pressable>
    </View>
  );

  const newWordsButtons = (
    <View style={{ width: '100%', marginTop: 24 }}>
      <Pressable style={s.button} onPress={() => addNewWords('en')} disabled={adding}>
        <Text style={s.bt}>+ {NEW_WORDS_BATCH} new words (EN → UZ)</Text>
      </Pressable>
      <Pressable style={[s.button, s.secondary]} onPress={() => addNewWords('uz')} disabled={adding}>
        <Text style={s.btSecondary}>+ {NEW_WORDS_BATCH} new words (UZ → EN)</Text>
      </Pressable>
      {adding && <ActivityIndicator style={{ marginTop: 12 }} />}
      {addError && <Text style={s.errorText}>{addError}</Text>}
            <View style={{ alignItems: 'center', marginTop: 16 }}>{flashcardsButton}</View>
    </View>
  );

  if (done) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.result}>
          <Text style={s.title}>Quiz Complete!</Text>
          <Text style={s.score}>
            {correct} / {w.length}
          </Text>
          <Text style={s.acc}>{w.length ? Math.round((correct / w.length) * 100) : 0}% accuracy</Text>
          {missed.length > 0 && (
            <View style={{ width: '100%', marginTop: 24 }}>
              <Text style={s.st}>Words to review</Text>
              {missed.map(x => (
                <View style={s.missed} key={x.id}>
                  <Text style={s.mw}>{x.word}</Text>
                  <Text>{x.translations.join(', ')}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable style={s.button} onPress={load}>
            <Text style={s.bt}>Practice Again</Text>
          </Pressable>
          <View style={{ marginTop: 12 }}>{flashcardsButton}</View>
        </View>
      </SafeAreaView>
    );
  }

  if (!cur) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.result}>
          <Text style={s.title}>No words to review</Text>
          <Text style={s.acc}>Search some words, or start with the most common words:</Text>
          {newWordsButtons}
        </View>
      </SafeAreaView>
    );
  }

  const target = wordLang(cur) === 'en' ? 'Uzbek' : 'English';

  return (
    <SafeAreaView style={s.c}>
      <View style={s.p}>
        <View style={s.top}> 
          {flashcardsButton}
          <Text>
            {i + 1} / {w.length}
          </Text>
        </View>
        <View style={s.card}>
          <Text>What does this word mean?</Text>
          <Text style={s.word}>{cur.word}</Text>
          {cur.pronunciation && <Text style={s.sub}>{cur.pronunciation}</Text>}
          <View style={{ marginTop: 12 }}>
            <SpeakButton text={cur.word} lang={wordLang(cur)} audioUrl={cur.audioUrl} />
          </View>
          <TextInput
            style={s.input}
            placeholder={`Type the ${target} translation...`}
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
              <Text style={s.bt}>Check Answer</Text>
            </Pressable>
          )}
          {shown && (
            <>
              <Text style={autoCorrect ? s.good : s.bad}>{autoCorrect ? '✓ Correct!' : '✕ Not quite'}</Text>
              <Text style={s.trans}>{cur.translations.join(', ')}</Text>
              <View style={s.buttons}>
                <Pressable style={[s.ans, s.wrong]} onPress={() => finish(false)}>
                  <Text style={s.bt}>Wrong</Text>
                </Pressable>
                <Pressable style={[s.ans, s.right]} onPress={() => finish(true)}>
                  <Text style={s.bt}>Correct</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  p: { flex: 1, padding: spacing.lg },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  cardsBtnText: { color: colors.primary, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  card: {
    marginTop: 32,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  word: { marginTop: 24, fontSize: 36, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sub: { marginTop: 8, color: colors.textSecondary },
  input: {
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
  },
    modes: { flexDirection: 'row', gap: 6 },
  button: {
    marginTop: 16,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  bt: { color: colors.white, fontWeight: '600' },
  btSecondary: { color: colors.primary, fontWeight: '600' },
  errorText: { marginTop: 12, color: '#DC2626', textAlign: 'center' },
  good: { marginTop: 16, color: colors.success, fontSize: 18, fontWeight: '700' },
  bad: { marginTop: 16, color: '#DC2626', fontSize: 18, fontWeight: '700' },
  trans: { marginTop: 8, fontSize: 22, fontWeight: '600', color: colors.success, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8, width: '100%' },
  ans: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  wrong: { backgroundColor: '#DC2626' },
  right: { backgroundColor: colors.success },
  result: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 52, fontWeight: '700', color: colors.primary, marginTop: 24 },
  acc: { fontSize: 18, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
  st: { fontSize: 18, fontWeight: '700', color: colors.text },
  missed: {
    width: '100%',
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mw: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
});
