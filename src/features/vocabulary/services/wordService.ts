import { Platform } from 'react-native';

import { getStoredWord, saveWord } from '../../../services/storage/wordStorage';
import { Lang, makeWordId, Word } from '../types/word';
import { normalize } from '../utils/normalize';
import { lookupWord } from './dictionaryService';

/**
 * Backend adresi. Android emülatörü bilgisayara 10.0.2.2 ile, iOS simülatörü
 * localhost ile ulaşır. Gerçek cihazda bilgisayarınızın yerel IP'sini yazın.
 */
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const API_TIMEOUT_MS = 6000;

async function fetchFromApi(text: string, from: Lang, needTranslation: boolean): Promise<Word> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const url =
      `${API_URL}/api/words/${encodeURIComponent(text)}` +
      `?from=${from}&translate=${needTranslation ? 1 : 0}`;
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) {
      throw new Error('Word not found');
    }
    return (await r.json()) as Word;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kelimeyi getirir. Sıra:
 *  1. Daha önce kaydedildiyse cihazdaki kayıt
 *  2. Yerel sözlük (vocab.db): çeviriler + örnek cümleler, internetsiz
 *  3. Backend: İngilizce tanım/telaffuz/ses (dictionaryapi.dev) ve
 *     yerel sözlükte yoksa Tilmoch makine çevirisi
 * İnternet yoksa ama yerel sözlükte varsa yine sonuç döner.
 */
export const getWord = async (text: string, from: Lang = 'en'): Promise<Word> => {
  const n = normalize(text);
  if (!n) {
    throw new Error('Word not found');
  }
  const id = makeWordId(from, n);
  const cached = await getStoredWord(id);
    if (cached) {
    let w = cached.word;
    let changed = false;
        const needGroups = !w.translationGroups && w.source !== 'api';
    if (needGroups || !w.pronunciation) {
      const local = await lookupWord(n, from).catch(() => null);
      if (local && needGroups) {
        w = { ...w, pronunciation: local.pronunciation || w.pronunciation, audioUrl: local.audioUrl, meanings: local.meanings };
        changed = true;
      }
      if (local?.pronunciation && !w.pronunciation) {
        w = { ...w, pronunciation: local.pronunciation };
        changed = true;
      }
    }
    if (changed) {
      await saveWord(w);
    }
    return w;
  }

  const local = await lookupWord(n, from).catch(e => {
    console.warn('[dictionary]', e);
    return null;
  });

  // Özbekçe kelimede backend sadece çeviri yapabilir; yerelde varsa gerek yok
  const needApi = from === 'en' || !local;
  const api = needApi ? await fetchFromApi(n, from, !local).catch(() => null) : null;

  if (!local && !api) {
    throw new Error('Word not found');
  }

  const word: Word = {
    id,
    word: local?.word ?? api?.word ?? text.trim(),
    lang: from,
    translations: local?.translations.length ? local.translations : api?.translations ?? [],
    translationGroups: local?.translationGroups,
    pronunciation: api?.pronunciation || local?.pronunciation,
    audioUrl: api?.audioUrl,
    meanings: api?.meanings ?? [],
    examples: local?.examples ?? [],
    source: local?.translations.length ? 'dictionary' : 'api',
  };
  if (!word.translations.length) {
    throw new Error('Word not found');
  }
  await saveWord(word);
  return word;
};
