import { getStoredWord, updateWordState } from '../../../services/storage/wordStorage';
import { recordActivity } from '../../../core/progress/activity';
import { DEFAULT_EASE, Grade, isDueState, nextIntervals, schedule, SrsState } from '../../../core/srs/sm2';
import { UserWordState } from '../types/word';

const ms = (s?: string) => (s ? Date.parse(s) : null);
const iso = (t: number | null) => (t == null ? undefined : new Date(t).toISOString());

/** Kelime durumu → SM-2 durumu */
export function toSrs(s: UserWordState): SrsState {
  return {
    reps: s.reps ?? 0,
    lapses: s.lapses ?? 0,
    ease: s.ease ?? DEFAULT_EASE,
    intervalDays: s.reviewInterval,
    dueAt: ms(s.nextReviewAt),
    lastReviewAt: ms(s.lastReviewedAt),
    reviewCount: s.reviewCount,
    correctCount: s.correctCount,
    wrongCount: s.wrongCount,
    status: s.learningStatus,
  };
}

/** Tekrar zamanı geldi mi? (yeni kelimeler hemen; elle "öğrendim" denenler gelmez) */
export const isDue = (s: UserWordState, now = new Date()) => isDueState(toSrs(s), now.getTime());

/** Kart ekranındaki düğmelerin altında gösterilecek aralıklar (gün) */
export const previewIntervals = (s: UserWordState) => nextIntervals(toSrs(s));

/**
 * Bir kelimenin cevabını kaydeder: SM-2 tekrar takvimi + günlük aktivite (seri / hedef).
 * Tüm alıştırma modları bunu çağırır.
 *  - true/false: doğru → 'good', yanlış → 'again'
 *  - Kartlarda kullanıcı 4 düğmeden birini seçer ('again' | 'hard' | 'good' | 'easy')
 */
export const recordReview = async (wordId: string, result: boolean | Grade) => {
  const grade: Grade = typeof result === 'boolean' ? (result ? 'good' : 'again') : result;
  await recordActivity(grade !== 'again');
  const stored = await getStoredWord(wordId);
  if (!stored) {
    return null;
  }
  const next = schedule(toSrs(stored.state), grade);
  return updateWordState(wordId, {
    reps: next.reps,
    lapses: next.lapses,
    ease: next.ease,
    reviewCount: next.reviewCount,
    correctCount: next.correctCount,
    wrongCount: next.wrongCount,
    learningStatus: next.status,
    reviewInterval: next.intervalDays,
    nextReviewAt: iso(next.dueAt),
    lastReviewedAt: iso(next.lastReviewAt),
    isLearned: next.status === 'mastered',
  });
};

/** Elle "öğrendim" / "öğrenmedim" */
export const learnedChanges = (learned: boolean): Partial<UserWordState> =>
  learned
    ? { isLearned: true, learningStatus: 'mastered', reviewInterval: 30, nextReviewAt: iso(Date.now() + 30 * 864e5) }
    : { isLearned: false, learningStatus: 'learning', reviewInterval: 0, reps: 0, nextReviewAt: undefined };
