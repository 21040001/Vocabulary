import React from 'react';
import { Text, View } from 'react-native';
import { useSettings } from '../../../app/settings/SettingsContext';
import type { TKey } from '../../../i18n/strings';
import { makeStyles } from '../../../theme/makeStyles';

type Day = { key: string; date: Date; reviews: number };

const CHART_H = 120;

/** Son 7 günün çubuk grafiği; kesik çizgi günlük hedefi gösterir */
export default function WeeklyChart({ days, goal }: { days: Day[]; goal: number }) {
  const s = useStyles();
  const { t } = useSettings();
  const max = Math.max(goal, ...days.map(d => d.reviews), 1);
  const goalY = (goal / max) * CHART_H;
  const todayKey = days[days.length - 1]?.key;

  return (
    <View>
      <View style={[s.chart, { height: CHART_H + 18 }]}>
        <View style={[s.goalLine, { bottom: goalY }]} />
        <Text style={[s.goalLabel, { bottom: goalY + 2 }]}>{t('stats.goalLine')}</Text>
        {days.map(d => {
          const h = Math.max(2, (d.reviews / max) * CHART_H);
          return (
            <View key={d.key} style={s.col}>
              <Text style={s.value}>{d.reviews || ''}</Text>
              <View style={[s.bar, { height: h }, d.reviews >= goal && s.barDone, !d.reviews && s.barEmpty]} />
            </View>
          );
        })}
      </View>
      <View style={s.labels}>
        {days.map(d => (
          <Text key={d.key} style={[s.label, d.key === todayKey && s.today]}>
            {t(`day.${d.date.getDay()}` as TKey)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  value: { fontSize: 11, color: c.textSecondary, marginBottom: 2 },
  bar: { width: '100%', borderRadius: 6, backgroundColor: c.primary },
  barDone: { backgroundColor: c.success },
  barEmpty: { backgroundColor: c.border },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.textSecondary },
  goalLabel: { position: 'absolute', right: 0, fontSize: 10, color: c.textSecondary },
  labels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 12, color: c.textSecondary },
  today: { color: c.primary, fontWeight: '800' },
}));
