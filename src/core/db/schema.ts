/**
 * Kullanıcı veritabanı (user.db) şeması. Serideki TÜM uygulamalar aynı şemayı kullanır.
 *
 * Kurallar (ileride sunucuyla senkron için):
 * - Her satırda `updated_at` (ms) ve `dirty` (1 = sunucuya gönderilmedi) vardır.
 * - Silme yumuşaktır: `deleted = 1`. Satır fiziksel olarak silinmez, böylece
 *   silme işlemi de diğer cihazlara/uygulamalara taşınabilir.
 * - Birleştirmede "son yazan kazanır" (updated_at büyük olan).
 *
 * Yeni sürüm gerekirse diziye YENİ bir eleman ekleyin; eskileri asla değiştirmeyin.
 * Sürüm `PRAGMA user_version` ile tutulur.
 */
export const MIGRATIONS: string[][] = [
  // v1
  [
    // Basit anahtar/değer: profil (günlük hedef, seviye), bayraklar
    `CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1
    )`,
    // Kullanıcının kelime listesi (ortak): tüm uygulamalar okuyabilir/ekleyebilir
    `CREATE TABLE IF NOT EXISTS user_words (
      id TEXT PRIMARY KEY NOT NULL,
      lang TEXT NOT NULL,
      data TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_learned INTEGER NOT NULL DEFAULT 0,
      source_app TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      dirty INTEGER NOT NULL DEFAULT 1
    )`,
    // Ortak tekrar sistemi (SM-2). id = "<item_type>:<item_id>", örn. "word:apple"
    `CREATE TABLE IF NOT EXISTS srs_cards (
      id TEXT PRIMARY KEY NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      app TEXT NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      ease REAL NOT NULL DEFAULT 2.5,
      interval_days REAL NOT NULL DEFAULT 0,
      due_at INTEGER,
      last_review_at INTEGER,
      review_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      dirty INTEGER NOT NULL DEFAULT 1
    )`,
    'CREATE INDEX IF NOT EXISTS srs_cards_due ON srs_cards (item_type, deleted, due_at)',
    // Günlük çalışma (ortak seri / hedef / istatistik). Her uygulama kendi satırını yazar,
    // seri hesaplanırken günler toplanır.
    `CREATE TABLE IF NOT EXISTS activity (
      day TEXT NOT NULL,
      app TEXT NOT NULL,
      reviews INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (day, app)
    )`,
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Yedeklenen / senkronlanan tablolar */
export const SYNC_TABLES = ['kv', 'user_words', 'srs_cards', 'activity'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
