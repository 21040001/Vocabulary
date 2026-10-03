export type Colors = {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  /** Ana renkli düğmelerin üzerindeki yazı */
  white: string;
  success: string;
  danger: string;
  /** Alt bildirim (snackbar) gibi ters renkli alanlar */
  inverseBg: string;
  inverseText: string;
  inverseAccent: string;
};

export const lightColors: Colors = {
  primary: '#4F46E5',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#16A34A',
  danger: '#DC2626',
  inverseBg: '#1E293B',
  inverseText: '#FFFFFF',
  inverseAccent: '#A5B4FC',
};

export const darkColors: Colors = {
  primary: '#6366F1',
  background: '#0B1120',
  surface: '#151E2E',
  text: '#E2E8F0',
  textSecondary: '#94A3B8',
  border: '#263244',
  white: '#FFFFFF',
  success: '#22C55E',
  danger: '#F87171',
  inverseBg: '#E2E8F0',
  inverseText: '#0F172A',
  inverseAccent: '#4F46E5',
};

/**
 * Eski kodla uyumluluk için: tema kullanmayan bir dosya kalırsa açık temayla çalışır.
 * Yeni kodda `useTheme().colors` ya da `makeStyles` kullanın.
 */
export const colors = lightColors;
