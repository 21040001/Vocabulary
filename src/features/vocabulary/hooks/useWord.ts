import { useState } from 'react';
import { getWord } from '../services/wordService';
import { getStoredWord, updateWordState } from '../../../services/storage/wordStorage';
import { Lang, UserWordState, Word } from '../types/word';

export default function useWord() {
  const [word, setWord] = useState<Word | null>(null);
  const [state, setState] = useState<UserWordState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchWord = async (v: string, from: Lang = 'en') => {
    if (!v.trim()) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getWord(v, from);
      const stored = await getStoredWord(result.id);
      setWord(result);
      setState(stored?.state ?? null);
    } catch {
      setWord(null);
      setState(null);
      setError('Word not found');
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
