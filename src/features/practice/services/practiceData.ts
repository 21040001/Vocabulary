import { getAllStoredWords, StoredWord } from '../../../services/storage/wordStorage';
import { getRandomWordTexts } from '../../vocabulary/services/dictionaryService';
import { Lang, Word, wordLang } from '../../vocabulary/types/word';
import { normalize } from '../../vocabulary/utils/normalize';
import { shuffle } from '../utils/questions';

const isDue = (x: StoredWord, now: Date) =>
  x.state.learningStatus !== 'mastered' && (!x.state.nextReviewAt || new Date(x.state.nextReviewAt) <= now);

/**
 * Bir alıştırma oturumu için kelimeler: önce tekrar zamanı gelenler, sonra diğerleri.
 * Her oturumda farklı sırada gelsin diye karıştırılır.
 */
export async function getSessionWords(size: number, filter: (w: Word) => boolean = () => true) {
  const all = await getAllStoredWords();
  const now = new Date();
  const ok = all.filter(x => filter(x.word));
  const due = shuffle(ok.filter(x => isDue(x, now)));
  const rest = shuffle(ok.filter(x => !isDue(x, now)));
  return {
    session: [...due, ...rest].slice(0, size).map(x => x.word),
    all: all.map(x => x.word),
  };
}

/**
 * `targetLang` dilinde yanlış şık adayları. Önce kullanıcının kendi kelimeleri
 * (daha zorlayıcı), yeterli değilse sözlükten benzer sıklıkta rastgele kelimeler.
 */
export async function getOptionPool(targetLang: Lang, words: Word[], current: Word, min = 9): Promise<string[]> {
  const fromUser = words
    .filter(w => w.id !== current.id)
    .flatMap(w => (wordLang(w) === targetLang ? [w.word] : w.translations.slice(0, 1)));
  let pool = [...new Set(fromUser)];
  if (pool.length < min) {
    const exclude = new Set([...pool, ...current.translations, current.word].map(normalize));
    const more = await getRandomWordTexts(targetLang, min - pool.length + 3, exclude, current.freqRank).catch(
      () => [] as string[],
    );
    pool = pool.concat(more);
  }
  return pool;
}
