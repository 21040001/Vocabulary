import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSettings } from '../../../app/settings/SettingsContext';
import { StreakInfo } from '../../../core/progress/activity';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

/** Ana sayfadaki 🔥 seri + günlük hedef kartı */
export default function StreakCard({ info, onPractice }: { info: StreakInfo; onPractice: () => void }) {
  const s = useStyles();
  const { t } = useSettings();
  const pct = Math.min(1, info.goal ? info.today / info.goal : 0);
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={[s.flame, !info.current && s.flameOff]}>🔥</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.streak}>{info.current ? t('streak.days', { n: info.current }) : t('streak.none')}</Text>
          {info.best > 0 && <Text style={s.best}>{t('streak.best', { n: info.best })}</Text>}
        </View>
      </View>
      <View style={s.goalRow}>
        <Text style={s.goalText}>{t('goal.progress', { n: Math.min(info.today, 9999), goal: info.goal })}</Text>
        <Text style={info.goalMet ? s.done : s.left}>
          {info.goalMet ? t('goal.done') : t('goal.keepGoing', { n: info.goal - info.today })}
        </Text>
      </View>
      <View style={s.bar}>
        <View style={[s.fill, info.goalMet && s.fillDone, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      {!info.goalMet && (
        <Pressable style={s.btn} onPress={onPractice}>
          <Text style={s.btnText}>{t('goal.practice')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  flame: { fontSize: 36, marginRight: spacing.sm },
  flameOff: { opacity: 0.3 },
  streak: { fontSize: 20, fontWeight: '800', color: c.text },
  best: { marginTop: 2, fontSize: 13, color: c.textSecondary },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: spacing.md },
  goalText: { fontWeight: '600', color: c.text },
  left: { fontSize: 13, color: c.textSecondary },
  done: { fontSize: 13, fontWeight: '700', color: c.success },
  bar: { marginTop: 8, height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: c.primary },
  fillDone: { backgroundColor: c.success },
  btn: { marginTop: spacing.md, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  btnText: { color: c.white, fontWeight: '700' },
}));
