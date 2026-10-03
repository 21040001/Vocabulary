import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeMode, useSettings } from '../../../app/settings/SettingsContext';
import { AppLanguage } from '../../../i18n/strings';
import { clearSearchHistory } from '../../../services/storage/searchHistory';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'uz', label: 'Oʻzbekcha' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const s = useStyles();
  const { language, setLanguage, themeMode, setThemeMode, colors, t } = useSettings();
  const [cleared, setCleared] = useState(false);

  const themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.light'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.dark'), icon: 'moon-outline' },
  ];

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <Text style={s.section}>{t('settings.language')}</Text>
      <View style={s.group}>
        {LANGUAGES.map((l, i) => (
          <Pressable key={l.value} style={[s.row, i > 0 && s.divider]} onPress={() => setLanguage(l.value)}>
            <Text style={s.rowText}>{l.label}</Text>
            {language === l.value && <Icon name="checkmark" size={22} color={colors.primary} />}
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>{t('settings.appearance')}</Text>
      <View style={s.group}>
        {themes.map((m, i) => (
          <Pressable key={m.value} style={[s.row, i > 0 && s.divider]} onPress={() => setThemeMode(m.value)}>
            <Icon name={m.icon} size={20} color={colors.textSecondary} />
            <Text style={[s.rowText, { marginLeft: 12 }]}>{m.label}</Text>
            {themeMode === m.value && <Icon name="checkmark" size={22} color={colors.primary} />}
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>{t('settings.history')}</Text>
      <View style={s.group}>
        <Pressable
          style={s.row}
          onPress={async () => {
            await clearSearchHistory();
            setCleared(true);
          }}>
          <Icon name="trash-outline" size={20} color={colors.danger} />
          <Text style={[s.rowText, { marginLeft: 12, color: colors.danger }]}>{t('settings.clearHistory')}</Text>
        </Pressable>
      </View>
      {cleared && <Text style={s.note}>{t('settings.historyCleared')}</Text>}

      <Text style={s.section}>{t('settings.about')}</Text>
      <View style={[s.group, { padding: spacing.md }]}>
        <Text style={s.about}>{t('settings.attribution')}</Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
  },
  group: { borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  rowText: { flex: 1, fontSize: 16, color: c.text },
  note: { marginTop: spacing.sm, color: c.success },
  about: { color: c.textSecondary, lineHeight: 20 },
}));
