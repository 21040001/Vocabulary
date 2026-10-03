/**
 * Günlük çalışma kaydı: ortak seri, günlük hedef ve istatistik.
 * Her uygulama kendi satırını yazar (activity.app); okurken günler TOPLANIR,
 * böylece Grammar'da çözülen sorular da aynı seriye sayılır (senkron sonrası).
 */
import { APP, AppKey } from '../config';
import { nowMs, query, run } from '../db/userDb';

/** Bir günün çalışma özeti */
export type DayActivity = { reviews: number; correct: number };
/** 'YYYY-MM-DD' (telefonun yerel saatiyle) -> o günün özeti */
export type ActivityLog = Record<string, DayActivity>;

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saate göre gün anahtarı: 2026-10-03 */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Tüm uygulamaların toplamı (varsayılan) ya da tek bir uygulama */
export async function getActivity(app?: AppKey): Promise<ActivityLog> {
  try {
    const rows = await query(
      `SELECT day, SUM(reviews) AS reviews, SUM(correct) AS correct FROM activity
        ${app ? 'WHERE app = ?' : ''} GROUP BY day`,
      app ? [app] : [],
    );
    const log: ActivityLog = {};
    for (const r of rows) {
      log[String(r.day)] = { reviews: Number(r.reviews ?? 0), correct: Number(r.correct ?? 0) };
    }
    return log;
  } catch {
    return {};
  }
}

/** Her cevaplanan alıştırma sorusundan sonra çağrılır */
export async function recordActivity(isCorrect: boolean, now = new Date(), app: AppKey = APP.key): Promise<void> {
  await run(
    `INSERT INTO activity (day, app, reviews, correct, updated_at, dirty) VALUES (?, ?, 1, ?, ?, 1)
     ON CONFLICT(day, app) DO UPDATE SET
       reviews = reviews + 1, correct = correct + excluded.correct, updated_at = excluded.updated_at, dirty = 1`,
    [dateKey(now), app, isCorrect ? 1 : 0, nowMs()],
  );
}

export type StreakInfo = {
  /** Bugün çalışılan kelime sayısı */
  today: number;
  goal: number;
  goalMet: boolean;
  /** Hedefin tutturulduğu ardışık gün sayısı (bugün henüz bitmediyse dünden geriye sayılır) */
  current: number;
  best: number;
  activeDays: number;
};

/**
 * Seri: günlük hedefin tutturulduğu ardışık günler.
 * Bugün hedef henüz tutmadıysa seri bozulmuş sayılmaz; dünden geriye sayılır.
 */
export function computeStreak(log: ActivityLog, goal: number, now = new Date()): StreakInfo {
  const met = (d: Date) => (log[dateKey(d)]?.reviews ?? 0) >= goal;
  const today = log[dateKey(now)]?.reviews ?? 0;
  const goalMet = today >= goal;

  let current = 0;
  let cursor = goalMet ? now : addDays(now, -1);
  while (met(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // En uzun seri: kayıtlı günleri sırayla dolaş
  const days = Object.keys(log)
    .filter(k => log[k].reviews >= goal)
    .sort();
  let best = 0;
  let streakLen = 0;
  let prev: string | null = null;
  for (const k of days) {
    if (prev) {
      const [y, m, d] = prev.split('-').map(Number);
      streakLen = dateKey(addDays(new Date(y, m - 1, d), 1)) === k ? streakLen + 1 : 1;
    } else {
      streakLen = 1;
    }
    best = Math.max(best, streakLen);
    prev = k;
  }

  const activeDays = Object.values(log).filter(d => d.reviews > 0).length;
  return { today, goal, goalMet, current, best: Math.max(best, current), activeDays };
}

/** Son n gün (eskiden yeniye): grafik ve takvim için */
export function lastDays(log: ActivityLog, n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(now, i - (n - 1));
    const k = dateKey(d);
    return { key: k, date: d, reviews: log[k]?.reviews ?? 0, correct: log[k]?.correct ?? 0 };
  });
}

/** Takvim rengi için gün seviyesi: 0 = hiç, 1–4 = hedefe göre artan yoğunluk */
export function activityLevel(reviews: number, goal: number): number {
  if (reviews <= 0) {
    return 0;
  }
  if (reviews < goal / 2) {
    return 1;
  }
  if (reviews < goal) {
    return 2;
  }
  return reviews < goal * 2 ? 3 : 4;
}
