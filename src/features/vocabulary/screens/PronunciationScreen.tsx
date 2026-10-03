import React, { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllStoredWords } from '../../../services/storage/wordStorage';
import SpeakButton from '../components/SpeakButton';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { Word, wordLang } from '../types/word';
import { displayGroups, posLabel } from '../utils/partOfSpeech';
import { judgePronunciation, Verdict } from '../utils/pronunciationMatch';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

const SESSION_SIZE = 10;
const MAX_TRIES = 3;

type Card = {
  word: Word;
  prompt: string;
  pos: string | null;
  expected: string[];
};

function toCard(w: Word): Card | null {
  if (wordLang(w) === 'en') {
    const groups = displayGroups(w);
    return { word: w, prompt: w.translations.slice(0, 2).join(', '), pos: groups[0]?.pos ?? null, expected: [w.word] };
  }
  const english = w.translations.filter(t => t.split(' ').length <= 3);
  if (!english.length) {
    return null;
  }
  return { word: w, prompt: w.word, pos: displayGroups(w)[0]?.pos ?? null, expected: english };
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function PronunciationScreen() {
  const { listen, stop, listening, partial, error } = useSpeechRecognition();
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [heard, setHeard] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [toPractice, setToPractice] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);

  const resetCard = () => {
    setTries(0);
    setVerdict(null);
    setHeard('');
    setRevealed(false);
  };

  const load = useCallback(async () => {
    const words = (await getAllStoredWords()).map(x => x.word);
    const deck = shuffle(words.map(toCard).filter((c): c is Card => !!c)).slice(0, SESSION_SIZE);
    setCards(deck);
    setI(0);
    setScore(0);
    setToPractice([]);
    resetCard();
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cur = cards[i];
  const passed = verdict === 'correct' || verdict === 'close';
  const outOfTries = tries >= MAX_TRIES && !passed;

  const onMic = async () => {
    if (listening) {
      stop();
      return;
    }
    if (!cur || passed || outOfTries) {
      return;
    }
    setVerdict(null);
    setHeard('');
    const alts = await listen('en-US');
    if (!alts.length) {
      return; // hiçbir şey duyulmadı; deneme hakkı yemesin
    }
    const r = judgePronunciation(alts, cur.expected);
    const attempt = tries + 1;
    setTries(attempt);
    setHeard(r.best);
    setVerdict(r.verdict);
    const ok = r.verdict !== 'wrong';
    if (ok && attempt === 1 && !revealed) {
      setScore(sc => sc + 1);
    }
    if (!ok && attempt === MAX_TRIES) {
      setRevealed(true);
    }
    if (attempt === 1 && !ok && !revealed) {
      setToPractice(p => [...p, cur]);
    }
  };

  const reveal = () => {
    setRevealed(true);
    if (tries === 0 && cur) {
      setToPractice(p => [...p, cur]);
    }
  };

  const next = () => {
    resetCard();
    setI(x => x + 1);
  };

  if (!loaded) {
    return <SafeAreaView style={s.c} />;
  }

  if (!cards.length) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.center}>
          <Text style={s.title}>No words yet</Text>
          <Text style={s.sub}>Search words or add new words in Quiz first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cur) {
    return (
      <SafeAreaView style={s.c}>
        <ScrollView contentContainerStyle={s.p}>
          <View style={s.center}>
            <Text style={s.title}>Well done 🎉</Text>
            <Text style={s.big}>
              {score} / {cards.length}
            </Text>
            <Text style={s.sub}>pronounced correctly on first try</Text>
            {toPractice.length > 0 && (
              <View style={s.box}>
                <Text style={s.boxTitle}>Practice these</Text>
                {toPractice.map(c => (
                  <View key={c.word.id} style={s.practiceRow}>
                    <Text style={s.practiceText}>
                      <Text style={{ fontWeight: '700' }}>{c.expected[0]}</Text> — {c.prompt}
                    </Text>
                    <SpeakButton text={c.expected[0]} lang="en" size={32} />
                  </View>
                ))}
              </View>
            )}
            <Pressable style={s.primary} onPress={load}>
              <Text style={s.primaryText}>Start again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const enWord = wordLang(cur.word) === 'en' ? cur.word : null;

  return (
    <SafeAreaView style={s.c}>
      <ScrollView contentContainerStyle={s.p}>
        <View style={s.top}>
          <Text style={s.counter}>
            {i + 1} / {cards.length}
          </Text>
          <Text style={s.counter}>Score: {score}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Say it in English</Text>
          {cur.pos && <Text style={s.pos}>{posLabel(cur.pos)}</Text>}
          <Text style={s.prompt}>{cur.prompt}</Text>

          {(revealed || passed) && (
            <View style={s.answerRow}>
              <Text style={s.answer}>{cur.expected[0]}</Text>
              <SpeakButton text={cur.expected[0]} lang="en" audioUrl={enWord?.audioUrl} size={36} />
            </View>
          )}
          {(revealed || passed) && enWord?.pronunciation && <Text style={s.ipa}>{enWord.pronunciation}</Text>}
        </View>

        <View style={s.feedback}>
          {listening && <Text style={s.listening}>🎙️ Listening… {partial ? `“${partial}”` : ''}</Text>}
          {!listening && verdict === 'correct' && <Text style={s.good}>✓ Correct!</Text>}
          {!listening && verdict === 'close' && <Text style={s.good}>👍 Close enough</Text>}
          {!listening && verdict === 'wrong' && (
            <Text style={s.bad}>
              ✕ We heard “{heard}”{!outOfTries ? ` — try again (${MAX_TRIES - tries} left)` : ''}
            </Text>
          )}
          {!listening && error && !verdict && <Text style={s.bad}>{error}</Text>}
        </View>

        {!passed && !outOfTries && (
          <Pressable
            style={[s.mic, listening && s.micActive]}
            onPress={onMic}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Start speaking'}>
            <Text style={s.micIcon}>{listening ? '⏹' : '🎤'}</Text>
            <Text style={s.micText}>{listening ? 'Tap to stop' : 'Tap and speak'}</Text>
          </Pressable>
        )}

        <View style={s.row}>
          {!passed && !revealed && (
            <Pressable style={[s.secondary, { flex: 1 }]} onPress={reveal}>
              <Text style={s.secondaryText}>Show answer</Text>
            </Pressable>
          )}
          {(passed || outOfTries || revealed) && (
            <Pressable style={[s.primary, { flex: 1, marginTop: 0 }]} onPress={next}>
              <Text style={s.primaryText}>Next →</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  p: { padding: spacing.lg },
  center: { alignItems: 'center', padding: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  counter: { color: colors.textSecondary, fontWeight: '600' },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    minHeight: 220,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.textSecondary },
  pos: {
    marginTop: spacing.sm,
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
  prompt: { marginTop: spacing.sm, fontSize: 34, fontWeight: '700', color: colors.text, textAlign: 'center' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  answer: { fontSize: 26, fontWeight: '700', color: colors.success },
  ipa: { marginTop: 4, color: colors.textSecondary },
  feedback: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  listening: { color: colors.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  good: { color: colors.success, fontSize: 20, fontWeight: '700' },
  bad: { color: '#DC2626', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  mic: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  micActive: { backgroundColor: '#DC2626' },
  micIcon: { fontSize: 40 },
  micText: { marginTop: 2, color: colors.white, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  primary: { marginTop: spacing.lg, padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  secondary: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  big: { marginTop: spacing.md, fontSize: 48, fontWeight: '700', color: colors.primary },
  sub: { marginTop: spacing.sm, color: colors.textSecondary, textAlign: 'center' },
  box: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxTitle: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  practiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  practiceText: { flex: 1, color: colors.text },
});