export type Lang = 'en' | 'uz';

export type WordDefinition = {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
};
export type WordMeaning = { partOfSpeech: string; definitions: WordDefinition[] };
export type WordExample = { en: string; uz: string };
/** Kelime türüne göre gruplanmış çeviriler: { pos: 'noun', translations: ['olma'] } */
export type TranslationGroup = { pos: string | null; translations: string[] };

export type Word = {
  /** İngilizce kelimeler için "apple", Özbekçe için "uz:olma" (eski kayıtlarla uyumlu) */
  id: string;
  word: string;
  /** Kelimenin dili. Eski kayıtlarda yok -> 'en' kabul edilir. */
  lang?: Lang;
  translations: string[];
  /** Yerel sözlükten: çevirilerin kelime türüne göre grupları */
  translationGroups?: TranslationGroup[];
  pronunciation?: string;
  audioUrl?: string;
  meanings: WordMeaning[];
  /** Yerel sözlükten (Tatoeba) örnek cümleler */
  examples?: WordExample[];
  /** Sıklık sırası (1 = en sık). Seviye paketleri için. */
  freqRank?: number;
  /** Çeviri kaynağı: 'dictionary' = yerel sözlük, 'api' = Tilmoch makine çevirisi */
  source?: 'dictionary' | 'api';
};

export type LearningStatus = 'new' | 'learning' | 'mastered';
export type UserWordState = {
  wordId: string;
  isFavorite: boolean;
  isLearned: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  learningStatus: LearningStatus;
  reviewInterval: number;
  nextReviewAt?: string;
  createdAt: string;
  lastReviewedAt?: string;
  /** SM-2: art arda doğru sayısı, unutma sayısı, kolaylık katsayısı */
  reps?: number;
  lapses?: number;
  ease?: number;
};

export const wordLang = (w: Pick<Word, 'lang'>): Lang => w.lang ?? 'en';

/** Kelime kimliği: İngilizce için eski biçim korunur. */
export const makeWordId = (lang: Lang, normalized: string) =>
  lang === 'en' ? normalized : `uz:${normalized}`;
