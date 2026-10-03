/**
 * Ortak tekrar kartları (srs_cards tablosu). Her uygulama kendi öğe türüyle kullanır:
 *   reviewItem('word', 'apple', 'good')
 *   reviewItem('grammar', 'present-simple', 'again')   // Grammar uygulaması
 */
import { APP, ItemType } from '../config';
import { nowMs, Params, query, Row, run } from '../db/userDb';
import { CardStatus, Grade, newSrsState, schedule, SrsState } from './sm2';

export type SrsCard = SrsState & {
  id: string;
  itemType: ItemType;
  itemId: string;
  app: string;
  createdAt: number;
  updatedAt: number;
};

export const cardId = (itemType: ItemType, itemId: string) => `${itemType}:${itemId}`;

const num = (v: unknown) => (v == null ? null : Number(v));

/** srs_cards satırı (ya da `c_` önekli JOIN sütunları) → SrsCard */
export function rowToCard(r: Row, prefix = ''): SrsCard {
  const g = (k: string) => r[prefix + k];
  return {
    id: String(g('id')),
    itemType: String(g('item_type')) as ItemType,
    itemId: String(g('item_id')),
    app: String(g('app')),
    reps: Number(g('reps') ?? 0),
    lapses: Number(g('lapses') ?? 0),
    ease: Number(g('ease') ?? 2.5),
    intervalDays: Number(g('interval_days') ?? 0),
    dueAt: num(g('due_at')),
    lastReviewAt: num(g('last_review_at')),
    reviewCount: Number(g('review_count') ?? 0),
    correctCount: Number(g('correct_count') ?? 0),
    wrongCount: Number(g('wrong_count') ?? 0),
    status: (String(g('status') ?? 'new') as CardStatus) || 'new',
    createdAt: Number(g('created_at') ?? 0),
    updatedAt: Number(g('updated_at') ?? 0),
  };
}

/** JOIN'lerde kullanmak için: "c.id AS c_id, c.reps AS c_reps, ..." */
export const CARD_COLUMNS = [
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
];
export const cardSelect = (alias: string, prefix = 'c_') =>
  CARD_COLUMNS.map(c => `${alias}.${c} AS ${prefix}${c}`).join(', ');

/** SrsState alanlarını yazan UPSERT. Silinmiş kart yeniden canlanır. */
export const UPSERT_CARD_SQL = `INSERT INTO srs_cards
  (id, item_type, item_id, app, reps, lapses, ease, interval_days, due_at, last_review_at,
   review_count, correct_count, wrong_count, status, created_at, updated_at, deleted, dirty)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,1)
  ON CONFLICT(id) DO UPDATE SET
   reps=excluded.reps, lapses=excluded.lapses, ease=excluded.ease, interval_days=excluded.interval_days,
   due_at=excluded.due_at, last_review_at=excluded.last_review_at, review_count=excluded.review_count,
   correct_count=excluded.correct_count, wrong_count=excluded.wrong_count, status=excluded.status,
   updated_at=excluded.updated_at, deleted=0, dirty=1`;

export function cardParams(c: SrsCard): Params {
  return [
    c.id,
    c.itemType,
    c.itemId,
    c.app,
    c.reps,
    c.lapses,
    c.ease,
    c.intervalDays,
    c.dueAt,
    c.lastReviewAt,
    c.reviewCount,
    c.correctCount,
    c.wrongCount,
    c.status,
    c.createdAt,
    c.updatedAt,
  ];
}

export function newCard(itemType: ItemType, itemId: string, now = nowMs()): SrsCard {
  return {
    ...newSrsState(),
    id: cardId(itemType, itemId),
    itemType,
    itemId,
    app: APP.key,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getCard(itemType: ItemType, itemId: string): Promise<SrsCard | null> {
  const rows = await query('SELECT * FROM srs_cards WHERE id = ? AND deleted = 0', [cardId(itemType, itemId)]);
  return rows.length ? rowToCard(rows[0]) : null;
}

/** Kart yoksa (ya da silinmişse) yeni kart oluşturur; varsa dokunmaz. */
export async function ensureCard(itemType: ItemType, itemId: string): Promise<void> {
  const c = newCard(itemType, itemId);
  await run(
    `INSERT INTO srs_cards (id, item_type, item_id, app, created_at, updated_at, deleted, dirty)
     VALUES (?,?,?,?,?,?,0,1)
     ON CONFLICT(id) DO UPDATE SET
       deleted=0, dirty=1, updated_at=excluded.updated_at, reps=0, lapses=0, ease=2.5, interval_days=0,
       due_at=NULL, last_review_at=NULL, review_count=0, correct_count=0, wrong_count=0, status='new'
     WHERE srs_cards.deleted = 1`,
    [c.id, c.itemType, c.itemId, c.app, c.createdAt, c.updatedAt],
  );
}

export async function saveCard(c: SrsCard): Promise<SrsCard> {
  const out = { ...c, updatedAt: nowMs() };
  await run(UPSERT_CARD_SQL, cardParams(out));
  return out;
}

/** Bir öğeyi değerlendirir (SM-2) ve kaydeder. Kart yoksa önce oluşturulur. */
export async function reviewItem(itemType: ItemType, itemId: string, grade: Grade, now = nowMs()): Promise<SrsCard> {
  const current = (await getCard(itemType, itemId)) ?? newCard(itemType, itemId, now);
  return saveCard({ ...current, ...schedule(current, grade, now) });
}

export async function deleteCard(itemType: ItemType, itemId: string): Promise<void> {
  await run('UPDATE srs_cards SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?', [
    nowMs(),
    cardId(itemType, itemId),
  ]);
}

/** Zamanı gelmiş kart sayısı (tür bazında) */
export async function countDue(itemType: ItemType, now = nowMs()): Promise<number> {
  const rows = await query(
    `SELECT COUNT(*) AS n FROM srs_cards
      WHERE item_type = ? AND deleted = 0
        AND ((due_at IS NULL AND status != 'mastered') OR due_at <= ?)`,
    [itemType, now],
  );
  return Number(rows[0]?.n ?? 0);
}
