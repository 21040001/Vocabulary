import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, TFunction, translate } from '../../i18n/strings';
import { Colors, darkColors, lightColors } from '../../theme/colors';

export type ThemeMode = 'system' | 'light' | 'dark';

type Settings = {
  language: AppLanguage;
  themeMode: ThemeMode;
};

type SettingsContextValue = Settings & {
  setLanguage: (l: AppLanguage) => void;
  setThemeMode: (m: ThemeMode) => void;
  /** Gerçekte kullanılan tema (system seçiliyse telefonun ayarı) */
  isDark: boolean;
  colors: Colors;
  t: TFunction;
};

const STORAGE_KEY = '@vocabulary/settings';
const DEFAULTS: Settings = { language: 'uz', themeMode: 'system' };

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && systemScheme === 'dark');

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setLanguage: language => update({ language }),
      setThemeMode: themeMode => update({ themeMode }),
      isDark,
      colors: isDark ? darkColors : lightColors,
      t: (key, params) => translate(settings.language, key, params),
    }),
    [settings, isDark, update],
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
