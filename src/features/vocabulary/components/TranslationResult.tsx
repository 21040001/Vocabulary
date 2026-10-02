import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type P = {
  word: string;
  translations: string[];
  pronunciation?: string;
  definition?: string;
  /** Yerel sözlükten örnek cümle ve çevirisi */
  example?: string;
  exampleTranslation?: string;
  /** Çeviri sözlükten değil Tilmoch API'sinden geldiyse küçük bir uyarı gösterilir */
  isMachineTranslation?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isLearned: boolean;
  onToggleLearned: () => void;
  onOpenDetails?: () => void;
};

export default function TranslationResult(p: P) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.word}>{p.word}</Text>
        <Pressable onPress={p.onToggleFavorite} hitSlop={8}>
          <Text style={s.heart}>{p.isFavorite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      {p.pronunciation && <Text style={s.sub}>{p.pronunciation}</Text>}
      <Text style={s.translation}>{p.translations.join(', ')}</Text>
      {p.isMachineTranslation && <Text style={s.badge}>Machine translation</Text>}
      {p.definition && <Text style={s.definition}>{p.definition}</Text>}
      {p.example && (
        <View style={s.example}>
          <Text style={s.exampleText}>“{p.example}”</Text>
          {p.exampleTranslation && <Text style={s.exampleTrans}>{p.exampleTranslation}</Text>}
        </View>
      )}
      <Pressable style={[s.button, p.isLearned && s.active]} onPress={p.onToggleLearned}>
        <Text style={s.buttonText}>{p.isLearned ? '✓ Learned' : 'Mark as learned'}</Text>
      </Pressable>
      {p.onOpenDetails && (
        <Pressable style={s.link} onPress={p.onOpenDetails}>
          <Text style={s.linkText}>Details →</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { flex: 1, fontSize: 28, fontWeight: '700', color: colors.text },
  heart: { fontSize: 30, color: colors.primary },
  sub: { marginTop: spacing.xs, color: colors.textSecondary },
  translation: { marginTop: spacing.md, fontSize: 21, fontWeight: '600', color: colors.success },
  badge: { marginTop: spacing.xs, fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  definition: { marginTop: spacing.md, lineHeight: 22, color: colors.textSecondary },
  example: { marginTop: spacing.md, paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.border },
  exampleText: { color: colors.text, lineHeight: 22 },
  exampleTrans: { marginTop: 2, color: colors.textSecondary, lineHeight: 20 },
  button: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  active: { backgroundColor: colors.success },
  buttonText: { color: colors.white, fontWeight: '600' },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
});
