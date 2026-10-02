/**
 * Yerel sözlük (vocab.db) bağlantısı.
 *
 * vocab.db uygulamayla birlikte gelir ve SALT OKUNURDUR. Kullanıcı verisi
 * (favoriler, quiz ilerlemesi) eskisi gibi AsyncStorage'da kalır.
 *
 * Sözlüğü yeniden ürettiğinizde VOCAB_DB_VERSION değerini güncelleyin:
 * uygulama eski kopyayı yenisiyle değiştirir.
 */
import { moveAssetsDatabase, open, type DB } from '@op-engineering/op-sqlite';

/** build_vocab_db.py çıktısının son satırındaki sürüm ("Bitti: ... sürüm X"). */
export const VOCAB_DB_VERSION = 2026100200;

const FILE = 'vocab.db';
let dbPromise: Promise<DB> | null = null;

async function installedVersion(db: DB): Promise<number> {
  const { rows } = await db.execute('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

async function init(): Promise<DB> {
  const copied = await moveAssetsDatabase({ filename: FILE });
  if (!copied) {
    throw new Error(
      'vocab.db bulunamadı. Android: android/app/src/main/assets/custom/vocab.db, ' +
        "iOS: Xcode > Build Phases > Copy Bundle Resources içine ekleyin.",
    );
  }
  let db = open({ name: FILE });
  if ((await installedVersion(db)) !== VOCAB_DB_VERSION) {
    // Uygulama güncellendi, yeni sözlüğü kopyala
    db.close();
    await moveAssetsDatabase({ filename: FILE, overwrite: true });
    db = open({ name: FILE });
  }
  return db;
}

/** Uygulama boyunca tek bağlantı. İlk çağrıda kurulum yapar. */
export function getVocabDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = init().catch(e => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
