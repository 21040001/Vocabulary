/**
 * Yedekleme / geri yükleme (dosya biçimi ve birleştirme). Dosya seçme kısmı backupFile.ts'te.
 *
 * Biçim serideki tüm uygulamalarda aynı: Grammar uygulamasında alınan yedek
 * Vocabulary'ye de yüklenebilir (aynı user.db şeması).
 *
 * Geri yükleme BİRLEŞTİRİR, silmez: aynı kayıt iki tarafta da varsa
 * `updated_at` değeri büyük (daha yeni) olan kalır. Böylece eski bir yedeği
 * yüklemek yeni ilerlemeyi bozmaz. (Sunucu senkronu da aynı kuralı kullanacak.)
 */
import { APP, SUITE } from '../config';
import { nowMs, query, transaction } from '../db/userDb';
import { SCHEMA_VERSION, SYNC_TABLES, SyncTable } from '../db/schema';
import { LOCAL_PREFIX } from '../profile/profile';

export const BACKUP_FORMAT = 'linguauz-backup';
export const BACKUP_VERSION = 1;

type Value = string | number | null;
type TableRow = Record<string, Value>;

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  schema: number;
  app: string;
  appVersion: string;
  exportedAt: string;
  tables: Record<SyncTable, TableRow[]>;
};

export type BackupSummary = { words: number; cards: number; days: number };

/** Her tablonun yedeğe giren sütunları (sırası önemli değil). Bilinmeyen sütunlar yok sayılır. */
const COLUMNS: Record<SyncTable, string[]> = {
  kv: ['key', 'value', 'updated_at'],
  user_words: ['id', 'lang', 'data', 'is_favorite', 'is_learned', 'source_app', 'created_at', 'updated_at', 'deleted'],
  srs_cards: [
    'id',
    'item_type',
    'item_id',
    'app',
    'reps',
    'lapses',
    'ease',
    'interval_days',
    'due_at',
    'last_review_at',
    'review_count',
    'correct_count',
    'wrong_count',
    'status',
    'created_at',
    'updated_at',
    'deleted',
  ],
  activity: ['day', 'app', 'reviews', 'correct', 'updated_at'],
};
const KEYS: Record<SyncTable, string[]> = {
  kv: ['key'],
  user_words: ['id'],
  srs_cards: ['id'],
  activity: ['day', 'app'],
};
/** Boş olamayacak sütunlar */
const REQUIRED: Record<SyncTable, string[]> = {
  kv: ['key', 'value', 'updated_at'],
  user_words: ['id', 'lang', 'data', 'created_at', 'updated_at'],
  srs_cards: ['id', 'item_type', 'item_id', 'app', 'created_at', 'updated_at'],
  activity: ['day', 'app', 'updated_at'],
};

export class BackupError extends Error {
  constructor(public reason: 'invalid' | 'newer') {
    super(reason);
  }
}

export async function createBackup(): Promise<BackupFile> {
  const tables = {} as Record<SyncTable, TableRow[]>;
  for (const table of SYNC_TABLES) {
    const where = table === 'kv' ? `WHERE key NOT LIKE '${LOCAL_PREFIX}%'` : '';
    const rows = await query(`SELECT ${COLUMNS[table].join(', ')} FROM ${table} ${where}`);
    tables[table] = rows.map(r => {
      const out: TableRow = {};
      for (const c of COLUMNS[table]) {
        const v = r[c];
        out[c] = v == null ? null : typeof v === 'number' || typeof v === 'string' ? v : String(v);
      }
      return out;
    });
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schema: SCHEMA_VERSION,
    app: APP.key,
    appVersion: APP.version,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export const backupFileName = (d = new Date()) =>
  `${SUITE.name.toLowerCase()}-backup-${d.toISOString().slice(0, 10)}.json`;

const isScalar = (v: unknown): v is Value => v === null || typeof v === 'string' || (typeof v === 'number' && isFinite(v));

/** Metni doğrular, geçersizse BackupError fırlatır. */
export function parseBackup(text: string): BackupFile {
  let b: any;
  try {
    b = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  if (!b || b.format !== BACKUP_FORMAT || typeof b.tables !== 'object' || b.tables === null) {
    throw new BackupError('invalid');
  }
  if (Number(b.version) > BACKUP_VERSION || Number(b.schema) > SCHEMA_VERSION) {
    throw new BackupError('newer');
  }
  const tables = {} as Record<SyncTable, TableRow[]>;
  for (const table of SYNC_TABLES) {
    const list = b.tables[table] ?? [];
    if (!Array.isArray(list)) {
      throw new BackupError('invalid');
    }
    tables[table] = list.map((r: any) => {
      if (!r || typeof r !== 'object') {
        throw new BackupError('invalid');
      }
      const out: TableRow = {};
      for (const c of COLUMNS[table]) {
        const v = typeof r[c] === 'boolean' ? Number(r[c]) : r[c] ?? null;
        if (!isScalar(v) || (v === null && REQUIRED[table].includes(c))) {
          throw new BackupError('invalid');
        }
        out[c] = v;
      }
      return out;
    });
  }
  return { ...b, tables };
}

export function summarize(b: BackupFile): BackupSummary {
  return {
    words: b.tables.user_words.filter(r => !Number(r.deleted)).length,
    cards: b.tables.srs_cards.filter(r => !Number(r.deleted)).length,
    days: new Set(b.tables.activity.map(r => r.day)).size,
  };
}

/** Yedeği mevcut verilerle birleştirir (tek işlem: ya hepsi ya hiçbiri). */
export async function restoreBackup(b: BackupFile): Promise<BackupSummary> {
  const now = nowMs();
  await transaction(async exec => {
    for (const table of SYNC_TABLES) {
      const cols = COLUMNS[table];
      const keys = KEYS[table];
      const placeholders = cols.map(() => '?').join(', ');
      // Sütunlara `dirty` eklenir: geri yüklenen veri ileride sunucuya da gitsin
      const insert = `INSERT INTO ${table} (${cols.join(', ')}, dirty) VALUES (${placeholders}, 1)`;
      let sql: string;
      if (table === 'activity') {
        // Aynı gün iki tarafta da varsa büyük olan sayı kalır
        sql = `${insert} ON CONFLICT(day, app) DO UPDATE SET
          reviews = MAX(activity.reviews, excluded.reviews),
          correct = MAX(activity.correct, excluded.correct),
          updated_at = MAX(activity.updated_at, excluded.updated_at), dirty = 1`;
      } else {
        const set = cols
          .filter(c => !keys.includes(c))
          .map(c => `${c} = excluded.${c}`)
          .join(', ');
        sql = `${insert} ON CONFLICT(${keys.join(', ')}) DO UPDATE SET ${set}, dirty = 1
          WHERE excluded.updated_at > ${table}.updated_at`;
      }
      for (const r of b.tables[table]) {
        if (table === 'kv' && String(r.key).startsWith(LOCAL_PREFIX)) {
          continue;
        }
        // Gelecekteki tarihli kayıt, sonraki gerçek değişiklikleri ezmesin
        const row: TableRow = { ...r, updated_at: Math.min(Number(r.updated_at), now) };
        await exec(sql, cols.map(c => row[c]));
      }
    }
  });
  return summarize(b);
}
