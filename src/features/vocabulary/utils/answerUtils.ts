import { normalize } from './normalize';

/**
 * Cevap karşılaştırması. Eskiden toLocaleLowerCase('tr-TR') kullanılıyordu:
 * bu "I" harfini "ı" yapar, İngilizce/Özbekçe cevaplarda yanlış sonuç verirdi.
 * normalize() ayrıca oʻ/o'/o‘ farkını ve Kiril yazımı da eşitler.
 */
export const normalizeAnswer = (v: string) =>
  normalize(v)
    .replace(/[.,!?;:"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Çevirilerden herhangi biriyle eşleşirse doğru. "to read" ile "read" de eşleşir. */
export const isAnswerCorrect = (user: string, answers: string[]) => {
  const u = normalizeAnswer(user).replace(/^to /, '');
  if (!u) {
    return false;
  }
  return answers.some(a => {
    const n = normalizeAnswer(a);
    return n === u || n.replace(/^to /, '') === u;
  });
};
