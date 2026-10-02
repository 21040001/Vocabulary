import { getDictionaryEntry } from './dictionaryService';
import { Lang, translate } from './translationService';
import { Word } from '../types/word';

/**
 * from='en': İngilizce tanım/telaffuz/ses (dictionaryapi.dev) + istenirse Özbekçe çeviri.
 * from='uz': Özbekçe -> İngilizce çeviri (Tilmoch).
 *
 * Uygulama çeviriyi önce yerel sözlükte arar; bulursa translate=false gönderir
 * ve ücretli çeviri API'si hiç çağrılmaz.
 *
 * Kaynaklardan biri başarısız olsa bile diğerinin sonucu döner. Hiçbiri sonuç
 * vermezse hata fırlatılır.
 */
export const getWord = async (word: string, from: Lang = 'en', withTranslation = true): Promise<Word> => {
  const n = word.trim().toLowerCase();

  if (from === 'uz') {
    const en = await translate(n, 'uz', 'en');
    return { id: `uz:${n}`, word: n, lang: 'uz', translations: [en], meanings: [] };
  }

  const [dict, tr] = await Promise.allSettled([
    getDictionaryEntry(n),
    withTranslation ? translate(n, 'en', 'uz') : Promise.reject(new Error('skipped')),
  ]);
  const dictionary = dict.status === 'fulfilled' ? dict.value : null;
  const translation = tr.status === 'fulfilled' ? tr.value : null;

  if (!dictionary && !translation) {
    throw new Error('Word not found');
  }

  return {
    id: n,
    word: dictionary?.word ?? n,
    lang: 'en',
    translations: translation ? [translation] : [],
    pronunciation: dictionary?.phonetic || dictionary?.phonetics?.find(x => x.text)?.text,
    audioUrl: dictionary?.phonetics?.find(x => x.audio)?.audio || undefined,
    meanings:
      dictionary?.meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.map(d => ({
          definition: d.definition,
          example: d.example,
          synonyms: d.synonyms ?? [],
          antonyms: d.antonyms ?? [],
        })),
      })) ?? [],
  };
};
