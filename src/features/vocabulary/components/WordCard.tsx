import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../../../app/settings/SettingsContext';
import { StoredWord } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

type Props = {
  item: StoredWord;
  onPress: () => void;
  /** Verilirse sağda "listeden çıkar" düğmesi görünür */
  onRemove?: () => void;
};

export default function WordCard({ item, onPress, onRemove }: Props) {
  const s = useStyles();
  const { colors, t } = useSettings();
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.word}>{item.word.word}</Text>
        <Text style={s.trans}>{item.word.translations.join(', ')}</Text>
        {item.word.pronunciation && <Text style={s.sub}>{item.word.pronunciation}</Text>}
      </View>
      {item.state.isLearned && !onRemove && <Text style={s.ok}>✓</Text>}
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={s.remove}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.remove')}: ${item.word.word}`}>
          <Icon name="close-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  word: { fontSize: 19, fontWeight: '700', color: c.text },
  trans: { marginTop: spacing.xs, color: c.textSecondary },
  sub: { marginTop: spacing.xs, fontSize: 13, color: c.textSecondary },
  ok: { fontSize: 22, color: c.success },
  remove: { marginLeft: spacing.sm, padding: 4 },
}));
