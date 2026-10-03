/**
 * Ortak profil (kv tablosu): serideki tüm uygulamalar aynı değerleri kullanır
 * ve ileride sunucu üzerinden senkronlanır.
 *
 * Cihaza özel ayarlar (dil, tema, hatırlatma saati) burada DEĞİL,
 * SettingsContext'te (AsyncStorage) kalır.
 */
import { nowMs, query, run } from '../db/userDb';

/** Ortak seviye (Grammar/Listening… uygulamaları içerik seçerken kullanacak) */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export type Profile = {
  /** Günde çalışılacak soru sayısı (tüm uygulamaların toplamı) */
  dailyGoal: number;
  level: CefrLevel | null;
};

export const PROFILE_DEFAULTS: Profile = { dailyGoal: 10, level: null };

const PREFIX = 'profile.';
/** Bu önekli anahtarlar sadece bu cihaza aittir: yedeğe/senkrona girmez */
export const LOCAL_PREFIX = 'local.';

export async function getKv(key: string): Promise<string | null> {
  const rows = await query('SELECT value FROM kv WHERE key = ?', [key]);
  return rows.length ? String(rows[0].value) : null;
}

export async function setKv(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO kv (key, value, updated_at, dirty) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, dirty = excluded.dirty`,
    [key, value, nowMs(), key.startsWith(LOCAL_PREFIX) ? 0 : 1],
  );
}

export async function getProfile(): Promise<Profile> {
  const out: Profile = { ...PROFILE_DEFAULTS };
  try {
    const rows = await query(`SELECT key, value FROM kv WHERE key LIKE '${PREFIX}%'`);
    for (const r of rows) {
      const k = String(r.key).slice(PREFIX.length) as keyof Profile;
      if (k in out) {
        (out as Record<string, unknown>)[k] = JSON.parse(String(r.value));
      }
    }
  } catch {
    // bozuk değer: varsayılanlar
  }
  return out;
}

export async function setProfile(patch: Partial<Profile>): Promise<void> {
  for (const [k, v] of Object.entries(patch)) {
    await setKv(PREFIX + k, JSON.stringify(v ?? null));
  }
}
