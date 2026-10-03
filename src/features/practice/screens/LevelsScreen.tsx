import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useSettings } from '../../../app/settings/SettingsContext';
import { getAllStoredWords, getStoredWordIds, saveWords, StoredWord } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import DirectionToggle from '../../vocabulary/components/DirectionToggle';
import { getFrequentWords, getLevelCounts } from '../../vocabulary/services/dictionaryService';
import { Lang, wordLang } from '../../vocabulary/types/word';
import { levelRange } from '../utils/questions';

const LEVEL_SIZE = 500;
const MAX_LEVELS = 10;
const BATCH = 10;

type LevelInfo = { level: number; total: number; added: number; learned: number };

function buildLevels(counts: number[], stored: StoredWord[], lang: Lang): LevelInfo[] {
  return counts
    .map((total, idx) => {
      const level = idx + 1;
      const { min, max } = levelRange(level, LEVEL_SIZE);
      const inLevel = stored.filter(
        x => wordLang(x.word) === lang && x.word.freqRank != null && x.word.freqRank >= min && x.word.freqRank <= max,
      );
      return {
        level,
        total,
        added: inLevel.length,
        learned: inLevel.filter(x => x.state.isLearned || x.state.learningStatus === 'mastered').length,
      };
    })
    .filter(l => l.total > 0);
}

/** Seviye paketleri: sözlük kelimeleri sıklığa göre 500'lük gruplara ayrılır */
export default function LevelsScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [lang, setLang] = useState<Lang>('en');
  const [levels, setLevels] = useState<LevelInfo[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (l: Lang) => {
    try {
      setFailed(false);
      const [counts, stored] = await Promise.all([getLevelCounts(l, LEVEL_SIZE, MAX_LEVELS), getAllStoredWords()]);
      setLevels(buildLevels(counts, stored, l));
    } catch (e) {
      console.warn('[levels]', e);
      setFailed(true);
      setLevels([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(lang);
    }, [load, lang]),
  );

  const add = async (level: number) => {
    setBusy(level);
    setMessage(null);
    try {
      const words = await getFrequentWords(lang, BATCH, await getStoredWordIds(), levelRange(level, LEVEL_SIZE));
      if (!words.length) {
        setMessage(t('levels.allAdded'));
        return;
      }
      await saveWords(words);
      await load(lang);
      setMessage(t('levels.added', { n: words.length }));
      nav.navigate('Flashcards');
    } catch (e) {
      console.warn('[levels] add', e);
      setMessage(t('quiz.dictUnavailable'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <DirectionToggle value={lang} onChange={l => { setLevels(null); setLang(l); }} />
      <Text style={s.intro}>{t('levels.intro')}</Text>
      {message && <Text style={s.message}>{message}</Text>}
      {failed && <Text style={s.error}>{t('quiz.dictUnavailable')}</Text>}
      {!levels && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
      {levels?.map(l => {
        const { min, max } = levelRange(l.level, LEVEL_SIZE);
        const pctAdded = l.total ? l.added / l.total : 0;
        const pctLearned = l.total ? l.learned / l.total : 0;
        const complete = l.added >= l.total;
        return (
          <View key={l.level} style={s.card}>
            <View style={s.row}>
              <View style={s.badge}>
                <Text style={s.badgeText}>{l.level}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{t('levels.level', { n: l.level })}</Text>
                <Text style={s.sub}>{t('levels.range', { from: min, to: max })}</Text>
              </View>
              <Pressable
                style={[s.addBtn, complete && s.addBtnDone]}
                disabled={busy !== null || complete}
                onPress={() => add(l.level)}>
                {busy === l.level ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={s.addText}>{complete ? '✓' : t('levels.add', { n: BATCH })}</Text>
                )}
              </Pressable>
            </View>
            {/* Açık çubuk: eklenenler, koyu çubuk: öğrenilenler */}
            <View style={s.bar}>
              <View style={[s.barAdded, { width: `${Math.round(pctAdded * 100)}%` }]} />
              <View style={[s.barLearned, { width: `${Math.round(pctLearned * 100)}%` }]} />
            </View>
            <Text style={s.progress}>
              {t('levels.progress', { added: l.added, learned: l.learned, total: l.total })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  intro: { marginTop: spacing.xs, color: c.textSecondary, lineHeight: 20 },
  message: { marginTop: spacing.sm, color: c.success, fontWeight: '600' },
  error: { marginTop: spacing.sm, color: c.danger },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.background,
    borderWidth: 2,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 18, fontWeight: '800', color: c.primary },
  title: { fontSize: 17, fontWeight: '700', color: c.text },
  sub: { marginTop: 2, fontSize: 13, color: c.textSecondary },
  addBtn: { minWidth: 92, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' },
  addBtnDone: { backgroundColor: c.success },
  addText: { color: c.white, fontWeight: '700' },
  bar: { marginTop: spacing.md, height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  barAdded: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: c.primary, opacity: 0.35 },
  barLearned: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: c.success },
  progress: { marginTop: 6, fontSize: 12, color: c.textSecondary },
}));
