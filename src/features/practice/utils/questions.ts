/**
 * Alıştırma modları için soru üretimi. Saf fonksiyonlar (test edilebilir, ağ/DB yok).
 */
import { Word, wordLang } from '../../vocabulary/types/word';
import { normalize } from '../../vocabulary/utils/normalize';

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export type ChoiceQuestion = {
  word: Word;
  /** Ekranda gösterilen / seslendirilen kelime */
  prompt: string;
  correct: string;
  options: string[];
};

/**
 * Bir kelime için 4 şıklı soru. `pool` aynı hedef dildeki aday yanlış şıklardır
 * (önce kullanıcının kendi kelimeleri, eksikse sözlükten rastgele).
 * Kelimenin herhangi bir çevirisiyle aynı olan aday şık olarak kullanılmaz.
 */
export function buildChoiceQuestion(word: Word, pool: string[], optionCount = 4): ChoiceQuestion | null {
  const correct = word.translations[0];
  if (!correct) {
    return null;
  }
  const forbidden = new Set(word.translations.map(normalize));
  const seen = new Set<string>();
  const distractors: string[] = [];
  for (const p of shuffle(pool)) {
    const n = normalize(p);
    if (!n || forbidden.has(n) || seen.has(n)) {
      continue;
    }
    seen.add(n);
    distractors.push(p);
    if (distractors.length === optionCount - 1) {
      break;
    }
  }
  if (distractors.length < optionCount - 1) {
    return null;
  }
  return { word, prompt: word.word, correct, options: shuffle([correct, ...distractors]) };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type BlankQuestion = {
  word: Word;
  /** "I am reading the ____." */
  sentence: string;
  /** Cümlenin Özbekçesi (ipucu) */
  hint: string;
  /** Boşluğa gelen kelime, cümledeki hâliyle ("books") */
  answer: string;
  /** Kelimenin sözlük hâli ("book") */
  base: string;
};

/**
 * Örnek cümlede İngilizce kelimeyi bulup boşluk yapar. İngilizce kelime:
 *  - kelime İngilizce ise kendisi
 *  - kelime Özbekçe ise İngilizce çevirilerinden cümlede geçen ilki
 * Basit çekimler de bulunur: book -> books, read -> reading, like -> liked.
 */
export function buildBlankQuestion(word: Word): BlankQuestion | null {
  const candidates = wordLang(word) === 'en' ? [word.word] : word.translations;
  for (const ex of word.examples ?? []) {
    for (const base of candidates) {
      const b = base.trim();
      if (!b || b.split(' ').length > 2) {
        continue;
      }
      const stem = b.endsWith('e') ? b.slice(0, -1) : b;
      const re = new RegExp(`\\b(${escapeRe(b)}(?:s|es|ed|d|ing)?|${escapeRe(stem)}(?:ed|ing))\\b`, 'i');
      const m = ex.en.match(re);
      if (m && m.index !== undefined) {
        const sentence = ex.en.slice(0, m.index) + '_____' + ex.en.slice(m.index + m[0].length);
        return { word, sentence, hint: ex.uz, answer: m[0], base: b };
      }
    }
  }
  return null;
}

export type MatchPair = { id: string; left: string; right: string };

/** Eşleştirme oyunu için birbirinden farklı (sol ve sağ taraf tekrar etmeyen) çiftler */
export function buildMatchPairs(words: Word[], count = 5): MatchPair[] {
  const lefts = new Set<string>();
  const rights = new Set<string>();
  const pairs: MatchPair[] = [];
  for (const w of shuffle(words)) {
    const right = w.translations[0];
    if (!right) {
      continue;
    }
    const l = normalize(w.word);
    const r = normalize(right);
    if (lefts.has(l) || rights.has(r)) {
      continue;
    }
    lefts.add(l);
    rights.add(r);
    pairs.push({ id: w.id, left: w.word, right });
    if (pairs.length === count) {
      break;
    }
  }
  return pairs;
}

/** Seviye numarası (1'den başlar) -> sıklık aralığı */
export const levelRange = (level: number, size: number) => ({ min: (level - 1) * size + 1, max: level * size });
