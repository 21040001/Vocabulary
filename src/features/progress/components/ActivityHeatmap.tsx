import React from 'react';
import { Text, View } from 'react-native';
import { useSettings } from '../../../app/settings/SettingsContext';
import { ActivityLog, activityLevel as level, addDays, dateKey } from '../../../core/progress/activity';
import { makeStyles } from '../../../theme/makeStyles';

const WEEKS = 15;
const CELL = 14;
const GAP = 3;

const OPACITY = [1, 0.3, 0.55, 0.8, 1];

/** GitHub tarzı çalışma takvimi: sütunlar haftalar, satırlar haftanın günleri */
export default function ActivityHeatmap({ log, goal, now = new Date() }: { log: ActivityLog; goal: number; now?: Date }) {
  const s = useStyles();
  const { colors, t } = useSettings();
  // Son sütun bu hafta; hafta pazartesi başlar
  const weekday = (now.getDay() + 6) % 7; // Pzt=0 … Paz=6
  const start = addDays(now, -(WEEKS - 1) * 7 - weekday);

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      if (date > now) {
        return null;
      }
      const reviews = log[dateKey(date)]?.reviews ?? 0;
      return { key: dateKey(date), lvl: level(reviews, goal) };
    }),
  );

  const cellStyle = (lvl: number) =>
    lvl === 0
      ? { backgroundColor: colors.border }
      : { backgroundColor: colors.success, opacity: OPACITY[lvl] };

  return (
    <View>
      <View style={s.grid}>
        {columns.map((col, i) => (
          <View key={i} style={s.col}>
            {col.map((cell, j) =>
              cell ? (
                <View key={cell.key} style={[s.cell, cellStyle(cell.lvl)]} />
              ) : (
                <View key={`e${j}`} style={[s.cell, { backgroundColor: 'transparent' }]} />
              ),
            )}
          </View>
        ))}
      </View>
      <View style={s.legend}>
        <Text style={s.legendText}>{t('stats.less')}</Text>
        {[0, 1, 2, 3, 4].map(l => (
          <View key={l} style={[s.cell, cellStyle(l), { marginHorizontal: 2 }]} />
        ))}
        <Text style={s.legendText}>{t('stats.more')}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  grid: { flexDirection: 'row', gap: GAP, marginTop: 12, alignSelf: 'center' },
  col: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 },
  legendText: { fontSize: 11, color: c.textSecondary, marginHorizontal: 4 },
}));
