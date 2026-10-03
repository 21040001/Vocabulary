import { useState } from 'react';
import { getWord } from '../services/wordService';
import { getStoredWord, updateWordState } from '../../../services/storage/wordStorage';
import { addToSearchHistory } from '../../../services/storage/searchHistory';
import { Lang, UserWordState, Word } from '../types/word';

export default function useWord() {
  const [word, setWord] = useState<Word | null>(null);
  const [state, setState] = useState<UserWordState | null>(null);
  const [loading, setLoading] = useState(false);
  /** 'notFound' ya da null — ekranda çeviri ile gösterilir */
  const [error, setError] = useState<'notFound' | null>(null);

  /** Bulunursa true döner (arama geçmişine de eklenir) */
  const searchWord = async (v: string, from: Lang = 'en'): Promise<boolean> => {
    if (!v.trim()) {
      return false;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getWord(v, from);
      const stored = await getStoredWord(result.id);
      setWord(result);
      setState(stored?.state ?? null);
      await addToSearchHistory(result.word, from);
      return true;
    } catch {
      setWord(null);
      setState(null);
      setError('notFound');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!word || !state) {
      return;
    }
    const x = await updateWordState(word.id, { isFavorite: !state.isFavorite });
    if (x) {
      setState(x.state);
    }
  };

  const toggleLearned = async () => {
    if (!word || !state) {
      return;
    }
    const x = await updateWordState(word.id, {
      isLearned: !state.isLearned,
      learningStatus: !state.isLearned ? 'mastered' : 'learning',
    });
    if (x) {
      setState(x.state);
    }
  };

  return { word, state, loading, error, searchWord, toggleFavorite, toggleLearned };
}
