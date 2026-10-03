/**
 * SM-2 tabanlı aralıklı tekrar (Anki'ye benzer 4 düğme).
 * Saf fonksiyonlar: veritabanı bilmez, test etmesi kolay.
 *
 *  again (Bilmadim) → kart sıfırlanır, 10 dakika sonra tekrar
 *  hard  (Qiyin)    → aralık az büyür, kolaylık düşer
 *  good  (Yaxshi)   → aralık × kolaylık
 *  easy  (Oson)     → aralık × kolaylık × 1.3, kolaylık artar
 *
 * Aralık 21 günü geçince kart "mastered" (öğrenildi) sayılır.
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

export type CardStatus = 'new' | 'learning' | 'mastered';

export type SrsState = {
  /** Art arda doğru cevap sayısı (again ile sıfırlanır) */
  reps: number;
  /** Öğrenilmişken unutma sayısı */
  lapses: number;
  /** Kolaylık katsayısı (1.3 – 3.0 civarı) */
  ease: number;
  intervalDays: number;
  /** ms; null = hiç planlanmadı (yeni kart, hemen çalışılabilir) */
  dueAt: number | null;
  lastReviewAt: number | null;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  status: CardStatus;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RELEARN_MS = 10 * 60 * 1000;
export const MASTERED_DAYS = 21;
export const MAX_INTERVAL_DAYS = 365;
export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.2;

export const newSrsState = (): SrsState => ({
  reps: 0,
  lapses: 0,
  ease: DEFAULT_EASE,
  intervalDays: 0,
  dueAt: null,
  lastReviewAt: null,
  reviewCount: 0,
  correctCount: 0,
  wrongCount: 0,
  status: 'new',
});

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(e * 100) / 100));
const cap = (d: number) => Math.min(MAX_INTERVAL_DAYS, d);

/** Her düğme için bir sonraki aralık (gün). again = 0 (dakikalar içinde tekrar). */
export function nextIntervals(s: SrsState): Record<Grade, number> {
  const prev = Math.max(0, s.intervalDays);
  if (s.reps === 0) {
    return { again: 0, hard: 1, good: 2, easy: 4 };
  }
  const good = cap(Math.max(prev + 1, Math.round(prev * s.ease)));
  const hard = cap(Math.max(1, Math.min(good - 1, Math.max(prev, Math.round(prev * 1.2)))));
  const easy = cap(Math.max(good + 1, Math.round(prev * clampEase(s.ease + 0.15) * 1.3)));
  return { again: 0, hard, good, easy };
}

export function schedule(s: SrsState, grade: Grade, now = Date.now()): SrsState {
  const ivl = nextIntervals(s)[grade];
  const base = {
    ...s,
    lastReviewAt: now,
    reviewCount: s.reviewCount + 1,
    correctCount: s.correctCount + (grade === 'again' ? 0 : 1),
    wrongCount: s.wrongCount + (grade === 'again' ? 1 : 0),
  };
  if (grade === 'again') {
    return {
      ...base,
      reps: 0,
      lapses: s.reps > 0 || s.status === 'mastered' ? s.lapses + 1 : s.lapses,
      ease: clampEase(s.ease - 0.2),
      intervalDays: 0,
      dueAt: now + RELEARN_MS,
      status: 'learning',
    };
  }
  const ease = grade === 'hard' ? clampEase(s.ease - 0.15) : grade === 'easy' ? clampEase(s.ease + 0.15) : s.ease;
  return {
    ...base,
    reps: s.reps + 1,
    ease,
    intervalDays: ivl,
    dueAt: now + ivl * DAY_MS,
    status: ivl >= MASTERED_DAYS ? 'mastered' : 'learning',
  };
}

/** Çalışılma zamanı geldi mi? Planlanmamış yeni kart hemen gelir; elle "öğrendim" denen kart gelmez. */
export function isDueState(s: Pick<SrsState, 'dueAt' | 'status'>, now = Date.now()): boolean {
  return s.dueAt == null ? s.status !== 'mastered' : s.dueAt <= now;
}

/** Eski (AsyncStorage) sürümdeki sabit aralıklardan art arda doğru sayısını tahmin eder */
export function repsFromLegacyInterval(intervalDays: number): number {
  const legacy = [1, 2, 4, 7, 14, 30];
  if (intervalDays <= 0) {
    return 0;
  }
  const i = legacy.findIndex(x => x >= intervalDays);
  return (i < 0 ? legacy.length - 1 : i) + 1;
}
