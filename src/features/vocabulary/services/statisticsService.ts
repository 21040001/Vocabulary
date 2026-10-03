import { getAllStoredWords } from '../../../services/storage/wordStorage';
import { isDue } from './reviewService';

export type VocabularyStatistics = {
  totalWords: number;
  favoriteWords: number;
  learnedWords: number;
  totalReviews: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  learningProgress: number;
};
export type TodayStatistics = { totalWords: number; learnedWords: number; reviewWords: number; accuracy: number };

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const getVocabularyStatistics = async (): Promise<VocabularyStatistics> => {
  const w = await getAllStoredWords();
  const learnedWords = w.filter(x => x.state.isLearned).length;
  const totalReviews = w.reduce((a, x) => a + x.state.reviewCount, 0);
  const correctAnswers = w.reduce((a, x) => a + x.state.correctCount, 0);
  const wrongAnswers = w.reduce((a, x) => a + x.state.wrongCount, 0);
  return {
    totalWords: w.length,
    favoriteWords: w.filter(x => x.state.isFavorite).length,
    learnedWords,
    totalReviews,
    correctAnswers,
    wrongAnswers,
    accuracy: pct(correctAnswers, totalReviews),
    learningProgress: pct(learnedWords, w.length),
  };
};

export const getTodayStatistics = async (): Promise<TodayStatistics> => {
  const w = await getAllStoredWords();
  const now = new Date();
  const reviews = w.reduce((a, x) => a + x.state.reviewCount, 0);
  const correct = w.reduce((a, x) => a + x.state.correctCount, 0);
  return {
    totalWords: w.length,
    learnedWords: w.filter(x => x.state.learningStatus === 'mastered').length,
    reviewWords: w.filter(x => isDue(x.state, now)).length,
    accuracy: pct(correct, reviews),
  };
};
