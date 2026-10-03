import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

export type MissedItem = { id: string; left: string; right: string };

type Props = {
  title: string;
  score: number;
  total: number;
  subtitle: string;
  missed: MissedItem[];
  onAgain: () => void;
  extra?: React.ReactNode;
};

/** Alıştırma oturumu sonu: puan + tekrar edilecekler + "Yana" */
export default function SessionSummary({ title, score, total, subtitle, missed, onAgain, extra }: Props) {
  const s = useStyles();
  const t = useT();
  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.score}>
        {score} / {total}
      </Text>
      <Text style={s.sub}>{subtitle}</Text>
      {extra}
      {missed.length > 0 && (
        <View style={s.box}>
          <Text style={s.boxTitle}>{t('cards.keepPracticing')}</Text>
          {missed.map(m => (
            <Text key={m.id} style={s.row}>
              <Text style={{ fontWeight: '700' }}>{m.left}</Text> — {m.right}
            </Text>
          ))}
        </View>
      )}
      <Pressable style={s.primary} onPress={onAgain}>
        <Text style={s.primaryText}>{t('cards.startAgain')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, alignItems: 'center' },
  title: { marginTop: spacing.xl, fontSize: 26, fontWeight: '700', color: c.text, textAlign: 'center' },
  score: { marginTop: spacing.md, fontSize: 48, fontWeight: '700', color: c.primary },
  sub: { marginTop: spacing.sm, color: c.textSecondary, textAlign: 'center' },
  box: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  boxTitle: { fontWeight: '700', color: c.text, marginBottom: 6 },
  row: { marginTop: 4, color: c.text },
  primary: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: 16,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  primaryText: { color: c.white, fontWeight: '700', fontSize: 16 },
}));
