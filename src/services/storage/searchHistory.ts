import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from './storageKeys';
import { Lang } from '../../features/vocabulary/types/word';
import { normalize } from '../../features/vocabulary/utils/normalize';

export type HistoryItem = { text: string; lang: Lang; at: number };

const MAX_ITEMS = 20;

export async function getSearchHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKeys.searchHistory);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

const save = (items: HistoryItem[]) =>
  AsyncStorage.setItem(storageKeys.searchHistory, JSON.stringify(items)).catch(() => undefined);

const sameWord = (a: HistoryItem, text: string, lang: Lang) =>
  a.lang === lang && normalize(a.text) === normalize(text);

/** Başarılı aramadan sonra çağrılır. Aynı kelime tekrar aranırsa en üste taşınır. */
export async function addToSearchHistory(text: string, lang: Lang): Promise<HistoryItem[]> {
  const items = await getSearchHistory();
  const next = [{ text, lang, at: Date.now() }, ...items.filter(x => !sameWord(x, text, lang))].slice(0, MAX_ITEMS);
  await save(next);
  return next;
}

export async function removeFromSearchHistory(text: string, lang: Lang): Promise<HistoryItem[]> {
  const next = (await getSearchHistory()).filter(x => !sameWord(x, text, lang));
  await save(next);
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await save([]);
}
