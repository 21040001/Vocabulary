import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useT } from '../../../app/settings/SettingsContext';
import { getAllStoredWords, StoredWord, updateWordState } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { UserWordState } from '../types/word';
import WordCard from './WordCard';

type Props = {
  title: string;
  emptyText: string;
  filter: (w: StoredWord) => boolean;
  removeChanges: Partial<UserWordState>;
  removedMessage: string;
};

const UNDO_MS = 4000;

/**
 * Favoriler / Öğrenilenler gibi listeler için ortak ekran.
 * ✕ ile kelime listeden çıkar; 4 sn boyunca geri alınabilir.
 */
export default function RemovableWordList({ title, emptyText, filter, removeChanges, removedMessage }: Props) {
  const s = useStyles();
  const t = useT();
  const [items, setItems] = useState<StoredWord[]>([]);
  const [undo, setUndo] = useState<StoredWord | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const load = useCallback(async () => {
    setItems((await getAllStoredWords()).filter(filter));
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const remove = async (item: StoredWord) => {
    setItems(list => list.filter(x => x.word.id !== item.word.id));
    await updateWordState(item.state.wordId, removeChanges);
    setUndo(item);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const undoRemove = async () => {
    if (!undo) {
      return;
    }
    const prev = undo;
    setUndo(null);
    await updateWordState(prev.state.wordId, prev.state);
    await load();
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={x => x.word.id}
        renderItem={({ item }) => (
          <WordCard
            item={item}
            onPress={() => nav.navigate('WordDetail', { word: item.word })}
            onRemove={() => remove(item)}
          />
        )}
        ListEmptyComponent={<Text style={s.e}>{emptyText}</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      {undo && (
        <View style={s.snack}>
          <Text style={s.snackText} numberOfLines={1}>
            “{undo.word.word}” {removedMessage}
          </Text>
          <Pressable onPress={undoRemove} hitSlop={10}>
            <Text style={s.undo}>{t('common.undo')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background, padding: spacing.lg },
  t: { fontSize: 28, fontWeight: '700', color: c.text, marginBottom: 16 },
  e: { textAlign: 'center', marginTop: 40, color: c.textSecondary },
  snack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: c.inverseBg,
  },
  snackText: { flex: 1, color: c.inverseText },
  undo: { marginLeft: spacing.md, color: c.inverseAccent, fontWeight: '700' },
}));
