import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from './storageKeys';
import { UserWordState, Word } from '../../features/vocabulary/types/word';

export type StoredWord = { word: Word; state: UserWordState };
type StoredWords = Record<string, StoredWord>;

/** Kayıt anahtarı = word.id ("apple", "uz:olma"). Eski İngilizce kayıtlarla aynı. */
const key = (v: string) => v.trim().toLowerCase();

const newState = (wordId: string): UserWordState => ({
  wordId,
  isFavorite: false,
  isLearned: false,
  reviewCount: 0,
  correctCount: 0,
  wrongCount: 0,
  learningStatus: 'new',
  reviewInterval: 0,
  createdAt: new Date().toISOString(),
});

const getStoredWords = async (): Promise<StoredWords> => {
  const raw = await AsyncStorage.getItem(storageKeys.words);
  if (!raw) {
    return {};
  }
  const parsed = JSON.parse(raw) as Record<string, any>;
  const out: StoredWords = {};
  Object.entries(parsed).forEach(([k, x]) => {
    out[k] = {
      word: { ...x.word, lang: x.word.lang ?? 'en' },
      state: {
        wordId: x.state?.wordId ?? x.word.id,
        isFavorite: x.state?.isFavorite ?? false,
        isLearned: x.state?.isLearned ?? false,
        reviewCount: x.state?.reviewCount ?? 0,
        correctCount: x.state?.correctCount ?? 0,
        wrongCount: x.state?.wrongCount ?? 0,
        learningStatus: x.state?.learningStatus ?? (x.state?.isLearned ? 'mastered' : 'new'),
        reviewInterval: x.state?.reviewInterval ?? 0,
        nextReviewAt: x.state?.nextReviewAt,
        createdAt: x.state?.createdAt ?? new Date().toISOString(),
        lastReviewedAt: x.state?.lastReviewedAt,
      },
    };
  });
  return out;
};

const save = async (x: StoredWords) => AsyncStorage.setItem(storageKeys.words, JSON.stringify(x));

export const getStoredWord = async (wordId: string) => {
  const x = await getStoredWords();
  return x[key(wordId)] ?? null;
};

export const saveWord = async (word: Word) => {
  const x = await getStoredWords();
  const k = key(word.id);
  const stored: StoredWord = { word, state: x[k]?.state ?? newState(word.id) };
  x[k] = stored;
  await save(x);
  return stored;
};

/** Birden çok kelimeyi tek yazımda kaydeder (yeni kelime paketi eklerken). */
export const saveWords = async (words: Word[]) => {
  const x = await getStoredWords();
  for (const word of words) {
    const k = key(word.id);
    x[k] = { word, state: x[k]?.state ?? newState(word.id) };
  }
  await save(x);
};

export const updateWordState = async (wordId: string, changes: Partial<UserWordState>) => {
  const x = await getStoredWords();
  const k = Object.keys(x).find(i => x[i].state.wordId === wordId);
  if (!k) {
    return null;
  }
  x[k].state = { ...x[k].state, ...changes };
  await save(x);
  return x[k];
};

export const getAllStoredWords = async () => Object.values(await getStoredWords());

export const getStoredWordIds = async () => new Set(Object.keys(await getStoredWords()));

export const deleteWord = async (wordId: string) => {
  const x = await getStoredWords();
  const k = Object.keys(x).find(i => x[i].state.wordId === wordId);
  if (k) {
    delete x[k];
    await save(x);
  }
};
