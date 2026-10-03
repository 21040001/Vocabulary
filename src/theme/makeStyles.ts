import { StyleSheet } from 'react-native';
import { useTheme } from '../app/settings/SettingsContext';
import { Colors } from './colors';

/**
 * Temaya göre değişen stiller:
 *   const useStyles = makeStyles(c => ({ box: { backgroundColor: c.surface } }));
 *   function X() { const s = useStyles(); ... }
 * Her tema için stiller bir kez oluşturulur ve saklanır.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Colors) => T) {
  const cache = new WeakMap<Colors, T>();
  return function useStyles(): T {
    const { colors } = useTheme();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
