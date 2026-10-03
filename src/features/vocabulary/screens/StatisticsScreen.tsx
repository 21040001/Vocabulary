import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { getVocabularyStatistics, VocabularyStatistics } from '../services/statisticsService';

export default function StatisticsScreen() {
  const s = useStyles();
  const t = useT();
  const [x, setX] = useState<VocabularyStatistics | null>(null);

  useFocusEffect(
    useCallback(() => {
      getVocabularyStatistics().then(setX);
    }, []),
  );

  if (!x) {
    return (
      <View style={s.c}>
        <Text style={s.r}>{t('common.loading')}</Text>
      </View>
    );
  }

  const cards: [string, string | number][] = [
    [t('stats.total'), x.totalWords],
    [t('stats.favorites'), x.favoriteWords],
    [t('stats.learned'), x.learnedWords],
    [t('stats.accuracy'), x.accuracy + '%'],
  ];

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <Text style={s.t}>{t('stats.title')}</Text>
      <View style={s.grid}>
        {cards.map(([label, value]) => (
          <View style={s.card} key={label}>
            <Text style={s.n}>{value}</Text>
            <Text style={s.l}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={s.sec}>
        <Text style={s.st}>{t('stats.progress')}</Text>
        <Text style={s.big}>{x.learningProgress}%</Text>
      </View>
      <View style={s.sec}>
        <Text style={s.st}>{t('stats.quiz')}</Text>
        <Text style={s.r}>{t('stats.reviews', { n: x.totalReviews })}</Text>
        <Text style={s.r}>{t('stats.correct', { n: x.correctAnswers })}</Text>
        <Text style={s.r}>{t('stats.wrong', { n: x.wrongAnswers })}</Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg },
  t: { fontSize: 30, fontWeight: '700', color: c.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  card: { width: '48%', padding: 16, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  n: { fontSize: 24, fontWeight: '700', color: c.primary },
  l: { marginTop: 4, color: c.textSecondary },
  sec: { marginTop: 24, padding: 24, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  st: { fontSize: 18, fontWeight: '700', color: c.text },
  big: { marginTop: 16, fontSize: 34, fontWeight: '700', color: c.primary },
  r: { marginTop: 8, color: c.textSecondary },
}));
