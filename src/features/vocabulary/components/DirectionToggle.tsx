import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { Lang } from '../types/word';

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'EN → UZ' },
  { lang: 'uz', label: 'UZ → EN' },
];

/** Arama/quiz yönü seçici */
export default function DirectionToggle({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  const s = useStyles();
  return (
    <View style={s.wrap}>
      {OPTIONS.map(o => {
        const active = o.lang === value;
        return (
          <Pressable
            key={o.lang}
            style={[s.option, active && s.active]}
            onPress={() => onChange(o.lang)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text style={[s.text, active && s.activeText]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  wrap: { flexDirection: 'row', padding: 4, marginBottom: spacing.sm, borderRadius: 12, backgroundColor: c.border },
  option: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  active: { backgroundColor: c.surface },
  text: { fontWeight: '600', color: c.textSecondary },
  activeText: { color: c.primary },
}));
