import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/app/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/app/settings/SettingsContext';
import useReminderScheduler from './src/app/settings/useReminderScheduler';

function Root() {
  const { isDark, colors } = useSettings();
  useReminderScheduler();
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Root />
    </SettingsProvider>
  );
}
