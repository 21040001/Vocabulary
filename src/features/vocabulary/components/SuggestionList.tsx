import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { Suggestion } from '../services/dictionaryService';

/** Yerel sözlükten gelen öneriler (yazarken açılır) */
export default function SuggestionList({ items, onSelect }: { items: Suggestion[]; onSelect: (s: Suggestion) => void }) {
  const s = useStyles();
  if (!items.length) {
    return null;
  }
  return (
    <View style={s.list}>
      {items.map((item, i) => (
        <Pressable key={`${item.lang}:${item.word}`} style={[s.row, i > 0 && s.divider]} onPress={() => onSelect(item)}>
          <Text style={s.word}>{item.word}</Text>
          <Text style={s.trans} numberOfLines={1}>
            {item.translations.join(', ')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  list: {
    marginTop: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  word: { fontSize: 16, fontWeight: '600', color: c.text, marginRight: spacing.sm },
  trans: { flex: 1, textAlign: 'right', color: c.textSecondary },
}));
