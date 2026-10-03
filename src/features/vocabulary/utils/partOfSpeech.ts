import type { TFunction, TKey } from '../../../i18n/strings';
import { TranslationGroup, Word } from '../types/word';

/** Wiktionary/dictionaryapi kısaltmalarını okunur hale getirir. */
const LABELS: Record<string, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adjective: 'adjective',
  adv: 'adverb',
  adverb: 'adverb',
  pron: 'pronoun',
  pronoun: 'pronoun',
  prep: 'preposition',
  preposition: 'preposition',
  postp: 'postposition',
  conj: 'conjunction',
  conjunction: 'conjunction',
  intj: 'interjection',
  interjection: 'interjection',
  num: 'numeral',
  det: 'determiner',
  article: 'article',
  particle: 'particle',
  phrase: 'phrase',
  prep_phrase: 'phrase',
  contraction: 'contraction',
};

/** Kelime türünü (varsa t ile çevrilmiş) okunur ada çevirir: 'adj' -> 'adjective' / 'sifat' */
export function posLabel(pos: string | null | undefined, t?: TFunction): string | null {
  if (!pos) {
    return null;
  }
  const canon = LABELS[pos];
  if (canon && t) {
    return t(`pos.${canon}` as TKey);
  }
  return canon ?? pos.replace(/_/g, ' ');
}

/**
 * Gösterilecek türe göre gruplar:
 * - Yerel sözlükte varsa onun grupları (her türün kendi çevirileri)
 * - Yoksa (makine çevirisi) çeviriler tek grupta, türler dictionaryapi tanımlarından
 */
export function displayGroups(word: Word): TranslationGroup[] {
  if (word.translationGroups?.length) {
    return word.translationGroups;
  }
  const fromMeanings = [...new Set(word.meanings.map(m => m.partOfSpeech))];
  if (fromMeanings.length === 1) {
    return [{ pos: fromMeanings[0], translations: word.translations }];
  }
  return [{ pos: null, translations: word.translations }];
}

/** Makine çevirisinde birden çok tür varsa çevirinin yanında hepsini etiket olarak göstermek için */
export const meaningPosList = (word: Word, t?: TFunction) =>
  [...new Set(word.meanings.map(m => posLabel(m.partOfSpeech, t)).filter(Boolean))] as string[];
