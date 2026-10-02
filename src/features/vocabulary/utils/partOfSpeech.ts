import { TranslationGroup, Word } from '../types/word';

const LABELS: Record<string, string> = {
  noun: 'noun', verb: 'verb', adj: 'adjective', adjective: 'adjective',
  adv: 'adverb', adverb: 'adverb', pron: 'pronoun', pronoun: 'pronoun',
  prep: 'preposition', preposition: 'preposition', postp: 'postposition',
  conj: 'conjunction', conjunction: 'conjunction', intj: 'interjection',
  interjection: 'interjection', num: 'numeral', det: 'determiner',
  article: 'article', particle: 'particle', phrase: 'phrase',
  prep_phrase: 'phrase', contraction: 'contraction',
};

export const posLabel = (pos: string | null | undefined) =>
  pos ? LABELS[pos] ?? pos.replace(/_/g, ' ') : null;

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

export const meaningPosList = (word: Word) =>
  [...new Set(word.meanings.map(m => posLabel(m.partOfSpeech)).filter(Boolean))] as string[];