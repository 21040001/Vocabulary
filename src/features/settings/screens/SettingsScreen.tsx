import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { ThemeMode, useSettings } from '../../../app/settings/SettingsContext';
import { SUITE } from '../../../core/config';
import { BackupError } from '../../../core/backup/backup';
import { exportBackupToFile, pickBackupFile } from '../../../core/backup/backupFile';
import { AppLanguage } from '../../../i18n/strings';
import { clearSearchHistory } from '../../../services/storage/searchHistory';
import { ensurePermission } from '../../../services/notifications/reminders';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

const GOALS = [5, 10, 20, 30];
const TIMES = ['08:00', '12:00', '18:00', '20:00', '22:00'];

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'uz', label: 'Oʻzbekcha' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const s = useStyles();
  const {
    language,
    setLanguage,
    themeMode,
    setThemeMode,
    dailyGoal,
    setDailyGoal,
    reminderEnabled,
    reminderTime,
    setReminder,
    reloadProfile,
    colors,
    t,
  } = useSettings();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cleared, setCleared] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const errorText = (e: unknown) =>
    e instanceof BackupError ? t(e.reason === 'newer' ? 'backup.newer' : 'backup.invalid') : t('backup.failed');

  const doExport = async () => {
    setBackupMsg(null);
    setBusy(true);
    try {
      const r = await exportBackupToFile();
      if (r.status === 'saved') {
        setBackupMsg({ ok: true, text: t('backup.saved', { words: r.summary.words }) });
      }
    } catch (e) {
      console.warn('[backup] export', e);
      setBackupMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBackupMsg(null);
    setBusy(true);
    try {
      const picked = await pickBackupFile();
      if (picked.status !== 'picked') {
        return;
      }
      Alert.alert(
        t('backup.confirmTitle'),
        t('backup.confirmMsg', { words: picked.summary.words, days: picked.summary.days }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backup.restore'),
            onPress: async () => {
              setBusy(true);
              try {
                const r = await picked.apply();
                await reloadProfile();
                setBackupMsg({ ok: true, text: t('backup.restored', { words: r.words, days: r.days }) });
              } catch (e) {
                console.warn('[backup] restore', e);
                setBackupMsg({ ok: false, text: errorText(e) });
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      console.warn('[backup] pick', e);
      setBackupMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const toggleReminder = async (on: boolean) => {
    setDenied(false);
    if (on && !(await ensurePermission())) {
      setDenied(true);
    }
    setReminder(on);
  };

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

      <Text style={s.section}>{t('settings.goal')}</Text>
      <View style={[s.group, s.chips]}>
        {GOALS.map(g => (
          <Pressable key={g} style={[s.chip, dailyGoal === g && s.chipOn]} onPress={() => setDailyGoal(g)}>
            <Text style={[s.chipText, dailyGoal === g && s.chipTextOn]}>{t('settings.goalWords', { n: g })}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>{t('settings.reminders')}</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Icon name="notifications-outline" size={20} color={colors.textSecondary} />
          <Text style={[s.rowText, { marginLeft: 12 }]}>{t('settings.reminderOn')}</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        {reminderEnabled && (
          <View style={[s.divider, s.chips]}>
            {TIMES.map(tm => (
              <Pressable key={tm} style={[s.chip, reminderTime === tm && s.chipOn]} onPress={() => setReminder(true, tm)}>
                <Text style={[s.chipText, reminderTime === tm && s.chipTextOn]}>{tm}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {denied && <Text style={s.warn}>{t('settings.notifDenied')}</Text>}

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

      <Text style={s.section}>{t('backup.section')}</Text>
      <View style={s.group}>
        <Pressable style={s.row} onPress={doExport} disabled={busy}>
          <Icon name="download-outline" size={20} color={colors.textSecondary} />
          <Text style={[s.rowText, { marginLeft: 12 }]}>{t('backup.export')}</Text>
        </Pressable>
        <Pressable style={[s.row, s.divider]} onPress={doImport} disabled={busy}>
          <Icon name="folder-open-outline" size={20} color={colors.textSecondary} />
          <Text style={[s.rowText, { marginLeft: 12 }]}>{t('backup.import')}</Text>
        </Pressable>
      </View>
      {busy && <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} />}
      {backupMsg && <Text style={backupMsg.ok ? s.note : s.warn}>{backupMsg.text}</Text>}
      <Text style={s.hint}>{t('backup.hint')}</Text>

      <Text style={s.section}>{t('settings.about')}</Text>
      <View style={s.group}>
        <Pressable style={s.row} onPress={() => nav.navigate('About')}>
          <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[s.rowText, { marginLeft: 12 }]}>{t('about.title')}</Text>
          <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[s.row, s.divider]}
          onPress={() => Linking.openURL(SUITE.privacyUrl).catch(() => undefined)}>
          <Icon name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
          <Text style={[s.rowText, { marginLeft: 12 }]}>{t('about.privacy')}</Text>
          <Icon name="open-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={s.hint}>{t('settings.attribution')}</Text>
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
  hint: { marginTop: spacing.sm, fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: spacing.md },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: c.border },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { color: c.text, fontWeight: '600' },
  chipTextOn: { color: c.white },
  warn: { marginTop: spacing.sm, color: c.danger },
}));
