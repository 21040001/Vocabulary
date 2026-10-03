import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/app/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/app/settings/SettingsContext';

function Root() {
  const { isDark, colors } = useSettings();
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
