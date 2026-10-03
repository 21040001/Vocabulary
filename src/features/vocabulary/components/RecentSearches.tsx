import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../../../app/settings/SettingsContext';
import { HistoryItem } from '../../../services/storage/searchHistory';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

type Props = {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClear: () => void;
};

/** Arama kutusu boşken görünen "Son aramalar" listesi */
export default function RecentSearches({ items, onSelect, onRemove, onClear }: Props) {
  const s = useStyles();
  const { colors, t } = useSettings();
  if (!items.length) {
    return null;
  }
  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>{t('home.recent')}</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={s.clear}>{t('home.clear')}</Text>
        </Pressable>
      </View>
      {items.slice(0, 8).map((item, i) => (
        <Pressable
          key={`${item.lang}:${item.text}`}
          style={[s.row, i > 0 && s.divider]}
          onPress={() => onSelect(item)}>
          <Icon name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={s.text} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={s.lang}>{item.lang === 'en' ? 'EN' : 'UZ'}</Text>
          <Pressable onPress={() => onRemove(item)} hitSlop={10} accessibilityLabel={t('common.remove')}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  wrap: {
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
  },
  title: { fontSize: 13, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase' },
  clear: { fontSize: 13, fontWeight: '600', color: c.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  text: { flex: 1, fontSize: 16, color: c.text },
  lang: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
}));
