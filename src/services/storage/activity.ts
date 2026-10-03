import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from './storageKeys';

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

export async function getActivity(): Promise<ActivityLog> {
  try {
    const raw = await AsyncStorage.getItem(storageKeys.activity);
    return raw ? (JSON.parse(raw) as ActivityLog) : {};
  } catch {
    return {};
  }
}

/** Her cevaplanan alıştırma sorusundan sonra çağrılır */
export async function recordActivity(isCorrect: boolean, now = new Date()): Promise<ActivityLog> {
  const log = await getActivity();
  const k = dateKey(now);
  const day = log[k] ?? { reviews: 0, correct: 0 };
  log[k] = { reviews: day.reviews + 1, correct: day.correct + (isCorrect ? 1 : 0) };
  await AsyncStorage.setItem(storageKeys.activity, JSON.stringify(log)).catch(() => undefined);
  return log;
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
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    if (prev) {
      const [y, m, d] = prev.split('-').map(Number);
      run = dateKey(addDays(new Date(y, m - 1, d), 1)) === k ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
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
