import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useSettings } from '../../../app/settings/SettingsContext';
import type { TKey } from '../../../i18n/strings';
import { getAllStoredWords } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

type Mode = {
  key: string;
  icon: string;
  title: TKey;
  desc: TKey;
  go: (nav: NativeStackNavigationProp<RootStackParamList>) => void;
};

const MODES: Mode[] = [
  { key: 'choice', icon: 'list-outline', title: 'practice.choice', desc: 'practice.choiceDesc', go: n => n.navigate('ChoiceQuiz', { mode: 'read' }) },
  { key: 'cards', icon: 'albums-outline', title: 'practice.cards', desc: 'practice.cardsDesc', go: n => n.navigate('Flashcards') },
  { key: 'listen', icon: 'headset-outline', title: 'practice.listen', desc: 'practice.listenDesc', go: n => n.navigate('ChoiceQuiz', { mode: 'listen' }) },
  { key: 'fill', icon: 'text-outline', title: 'practice.fill', desc: 'practice.fillDesc', go: n => n.navigate('FillBlank') },
  { key: 'match', icon: 'git-compare-outline', title: 'practice.match', desc: 'practice.matchDesc', go: n => n.navigate('Match') },
  { key: 'write', icon: 'create-outline', title: 'practice.write', desc: 'practice.writeDesc', go: n => n.navigate('WriteQuiz') },
  { key: 'speak', icon: 'mic-outline', title: 'practice.speak', desc: 'practice.speakDesc', go: n => n.navigate('Pronunciation') },
];

/** "Mashq" sekmesi: tüm alıştırma modları ve seviyeler */
export default function PracticeHubScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [count, setCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAllStoredWords().then(w => setCount(w.length));
    }, []),
  );

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <Pressable style={s.levels} onPress={() => nav.navigate('Levels')}>
        <Icon name="layers-outline" size={32} color={colors.white} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={s.levelsTitle}>{t('practice.levels')}</Text>
          <Text style={s.levelsDesc}>{t('practice.levelsDesc')}</Text>
        </View>
        <Icon name="chevron-forward" size={22} color={colors.white} />
      </Pressable>

      {count !== null && (
        <Text style={s.count}>{count ? t('practice.wordsCount', { n: count }) : t('practice.noWordsHint')}</Text>
      )}

      <Text style={s.section}>{t('practice.modes')}</Text>
      <View style={s.grid}>
        {MODES.map(m => (
          <Pressable key={m.key} style={s.card} onPress={() => m.go(nav)} accessibilityRole="button">
            <Icon name={m.icon} size={28} color={colors.primary} />
            <Text style={s.cardTitle}>{t(m.title)}</Text>
            <Text style={s.cardDesc}>{t(m.desc)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  levels: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: c.primary,
  },
  levelsTitle: { fontSize: 20, fontWeight: '700', color: c.white },
  levelsDesc: { marginTop: 4, color: c.white, opacity: 0.9 },
  count: { marginTop: spacing.md, color: c.textSecondary, textAlign: 'center' },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: {
    width: '48.5%',
    minHeight: 120,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { marginTop: spacing.sm, fontSize: 16, fontWeight: '700', color: c.text },
  cardDesc: { marginTop: 4, fontSize: 13, color: c.textSecondary, lineHeight: 18 },
}));
