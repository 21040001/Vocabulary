/**
 * Tek seferlik aktarım: eski sürümlerin AsyncStorage verisi → user.db
 *
 * Sadece Vocabulary uygulamasının eski sürümlerinde AsyncStorage verisi vardı;
 * diğer uygulamalarda bu anahtarlar olmadığı için hiçbir şey yapmaz.
 * Eski anahtarlar SİLİNMEZ (bir sorun çıkarsa geri dönülebilsin).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DB, Scalar } from '@op-engineering/op-sqlite';
import { DEFAULT_EASE, repsFromLegacyInterval } from '../srs/sm2';

const FLAG = 'local.legacyImported';
const LEGACY = {
  words: '@vocabulary/words',
  activity: '@vocabulary/activity',
  settings: '@vocabulary/settings',
};

const ms = (iso: unknown, fallback: number | null): number | null => {
  if (typeof iso !== 'string') {
    return fallback;
  }
  const t = Date.parse(iso);
  return Number.isNaN(t) ? fallback : t;
};

async function readJson(key: string): Promise<any> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function importLegacyData(db: DB): Promise<void> {
  const { rows } = await db.execute('SELECT value FROM kv WHERE key = ?', [FLAG]);
  if (rows.length) {
    return;
  }
  const [words, activity, settings] = await Promise.all([
    readJson(LEGACY.words),
    readJson(LEGACY.activity),
    readJson(LEGACY.settings),
  ]);
  const now = Date.now();

  await db.transaction(async tx => {
    const exec = (sql: string, p: Scalar[]) => tx.execute(sql, p);

    if (words && typeof words === 'object') {
      for (const [k, x] of Object.entries<any>(words)) {
        if (!x?.word) {
          continue;
        }
        const id = String(k).trim().toLowerCase();
        const lang = x.word.lang ?? 'en';
        const st = x.state ?? {};
        const created = ms(st.createdAt, now)!;
        const interval = Number(st.reviewInterval ?? 0);
        const status = st.learningStatus ?? (st.isLearned ? 'mastered' : 'new');
        await exec(
          `INSERT OR IGNORE INTO user_words
            (id, lang, data, is_favorite, is_learned, source_app, created_at, updated_at, deleted, dirty)
            VALUES (?,?,?,?,?,?,?,?,0,1)`,
          [id, lang, JSON.stringify({ ...x.word, lang }), st.isFavorite ? 1 : 0, st.isLearned ? 1 : 0, 'vocabulary', created, now],
        );
        await exec(
          `INSERT OR IGNORE INTO srs_cards
            (id, item_type, item_id, app, reps, lapses, ease, interval_days, due_at, last_review_at,
             review_count, correct_count, wrong_count, status, created_at, updated_at, deleted, dirty)
            VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,0,1)`,
          [
            'word:' + id,
            'word',
            id,
            'vocabulary',
            repsFromLegacyInterval(interval),
            DEFAULT_EASE,
            interval,
            ms(st.nextReviewAt, null),
            ms(st.lastReviewedAt, null),
            Number(st.reviewCount ?? 0),
            Number(st.correctCount ?? 0),
            Number(st.wrongCount ?? 0),
            status,
            created,
            now,
          ],
        );
      }
    }

    if (activity && typeof activity === 'object') {
      for (const [day, a] of Object.entries<any>(activity)) {
        await exec(
          `INSERT OR IGNORE INTO activity (day, app, reviews, correct, updated_at, dirty) VALUES (?,?,?,?,?,1)`,
          [day, 'vocabulary', Number(a?.reviews ?? 0), Number(a?.correct ?? 0), now],
        );
      }
    }

    if (settings && typeof settings.dailyGoal === 'number') {
      await exec(`INSERT OR IGNORE INTO kv (key, value, updated_at, dirty) VALUES (?,?,?,1)`, [
        'profile.dailyGoal',
        JSON.stringify(settings.dailyGoal),
        now,
      ]);
    }

    await exec('INSERT INTO kv (key, value, updated_at, dirty) VALUES (?,?,?,0)', [FLAG, String(now), now]);
  });
}
