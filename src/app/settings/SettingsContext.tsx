import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, TFunction, translate } from '../../i18n/strings';
import { Colors, darkColors, lightColors } from '../../theme/colors';
import { getProfile, PROFILE_DEFAULTS, setProfile } from '../../core/profile/profile';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Ayarlar iki yerde durur:
 *  - Cihaza özel (dil, tema, hatırlatma): AsyncStorage
 *  - Ortak profil (günlük hedef): user.db → serideki tüm uygulamalarda aynı, yedeğe girer
 */
type DeviceSettings = {
  language: AppLanguage;
  themeMode: ThemeMode;
  reminderEnabled: boolean;
  /** 'HH:MM' */
  reminderTime: string;
};

type Settings = DeviceSettings & {
  /** Günde çalışılacak kelime (cevaplanan soru) sayısı — ortak profil */
  dailyGoal: number;
};

type SettingsContextValue = Settings & {
  setLanguage: (l: AppLanguage) => void;
  setThemeMode: (m: ThemeMode) => void;
  setDailyGoal: (n: number) => void;
  setReminder: (enabled: boolean, time?: string) => void;
  /** Yedek geri yüklendikten sonra ortak profili yeniden okur */
  reloadProfile: () => Promise<void>;
  /** Gerçekte kullanılan tema (system seçiliyse telefonun ayarı) */
  isDark: boolean;
  colors: Colors;
  t: TFunction;
};

const STORAGE_KEY = '@vocabulary/settings';
const DEFAULTS: DeviceSettings = {
  language: 'uz',
  themeMode: 'system',
  reminderEnabled: true,
  reminderTime: '20:00',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, dailyGoal: PROFILE_DEFAULTS.dailyGoal });
  const [loaded, setLoaded] = useState(false);
  const systemScheme = useColorScheme();

  const reloadProfile = useCallback(async () => {
    const p = await getProfile().catch(() => PROFILE_DEFAULTS);
    setSettings(prev => ({ ...prev, dailyGoal: p.dailyGoal }));
  }, []);

  useEffect(() => {
    const device = AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const saved = JSON.parse(raw);
          delete saved.dailyGoal; // eski sürümde buradaydı, artık profilde
          setSettings(prev => ({ ...prev, ...saved }));
        }
      })
      .catch(() => undefined);
    Promise.all([device, reloadProfile()]).finally(() => setLoaded(true));
  }, [reloadProfile]);

  const update = useCallback((patch: Partial<DeviceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      const deviceOnly: DeviceSettings = {
        language: next.language,
        themeMode: next.themeMode,
        reminderEnabled: next.reminderEnabled,
        reminderTime: next.reminderTime,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deviceOnly)).catch(() => undefined);
      return next;
    });
  }, []);

  const setDailyGoal = useCallback((dailyGoal: number) => {
    setSettings(prev => ({ ...prev, dailyGoal }));
    setProfile({ dailyGoal }).catch(() => undefined);
  }, []);

  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && systemScheme === 'dark');

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setLanguage: language => update({ language }),
      setThemeMode: themeMode => update({ themeMode }),
      setDailyGoal,
      reloadProfile,
      setReminder: (reminderEnabled, reminderTime) =>
        update(reminderTime ? { reminderEnabled, reminderTime } : { reminderEnabled }),
      isDark,
      colors: isDark ? darkColors : lightColors,
      t: (key, params) => translate(settings.language, key, params),
    }),
    [settings, isDark, update, setDailyGoal, reloadProfile],
  );

  // Ayarlar yüklenmeden çizme: yanlış dil/tema bir an görünmesin
  if (!loaded) {
    return null;
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return ctx;
}

export const useTheme = () => {
  const { colors, isDark } = useSettings();
  return { colors, isDark };
};

export const useT = () => useSettings().t;
