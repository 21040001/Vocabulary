/**
 * Kullanıcı verisi veritabanı (user.db): kelime listesi, tekrar kartları,
 * günlük aktivite, profil. Okunur/yazılır (vocab.db'nin aksine).
 *
 * İlk açılışta:
 *  1. Şema kurulur / güncellenir (schema.ts)
 *  2. Eski sürümün AsyncStorage verisi bir kez buraya aktarılır (legacy.ts)
 */
import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './schema';
import { importLegacyData } from './legacy';

const FILE = 'user.db';
let dbPromise: Promise<DB> | null = null;
let dbInstance: DB | null = null;

export type Row = Record<string, Scalar>;
export type Params = Scalar[];

async function migrate(db: DB) {
  const { rows } = await db.execute('PRAGMA user_version');
  const current = Number(rows[0]?.user_version ?? 0);
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async tx => {
      for (const sql of MIGRATIONS[v]) {
        await tx.execute(sql);
      }
      await tx.execute(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

async function init(): Promise<DB> {
  const db = open({ name: FILE });
  dbInstance = db;
  await migrate(db);
  // Aktarım başarısız olursa uygulama yine açılsın; bayrak yazılmadığı için sonraki açılışta tekrar dener
  await importLegacyData(db).catch(e => console.warn('[userDb] legacy import failed', e));
  return db;
}

/** Uygulama boyunca tek bağlantı. */
export function getUserDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = init().catch(e => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** Testler ve geri yükleme sonrası için: bağlantıyı kapatır, sonraki çağrıda yeniden açılır. */
export function closeUserDb() {
  try {
    dbInstance?.close();
  } catch {
    // zaten kapalı
  }
  dbInstance = null;
  dbPromise = null;
}

export async function query(sql: string, params: Params = []): Promise<Row[]> {
  const db = await getUserDb();
  const { rows } = await db.execute(sql, params);
  return rows;
}

export async function run(sql: string, params: Params = []): Promise<void> {
  const db = await getUserDb();
  await db.execute(sql, params);
}

/** Birden çok yazımı tek işlemde (hepsi ya da hiçbiri) yapar. */
export async function transaction(fn: (exec: (sql: string, params?: Params) => Promise<Row[]>) => Promise<void>) {
  const db = await getUserDb();
  await db.transaction(async tx => {
    await fn(async (sql, params = []) => (await tx.execute(sql, params)).rows);
  });
}

export const nowMs = () => Date.now();
