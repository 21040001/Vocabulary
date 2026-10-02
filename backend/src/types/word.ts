export type WordDefinition = { definition: string; example?: string; synonyms: string[]; antonyms: string[] };
export type WordMeaning = { partOfSpeech: string; definitions: WordDefinition[] };
export type Word = {
  id: string;
  word: string;
  lang?: 'en' | 'uz';
  translations: string[];
  pronunciation?: string;
  audioUrl?: string;
  meanings: WordMeaning[];
};
