/**
 * Kullanıcının kelime listesi — user.db (SQLite) üzerinde.
 *
 * Dışarıya açılan fonksiyonlar eski AsyncStorage sürümüyle AYNI; ekranlar
 * değişmeden çalışır. Veri iki tabloda durur:
 *   user_words  → kelimenin kendisi + favori / öğrenildi
 *   srs_cards   → tekrar takvimi (ortak SM-2 sistemi, item_type = 'word')
 */
import { cardId, cardParams, cardSelect, newCard, rowToCard, SrsCard, UPSERT_CARD_SQL } from '../../core/srs/cards';
import { APP } from '../../core/config';
import { nowMs, query, Row, transaction } from '../../core/db/userDb';
import { UserWordState, Word } from '../../features/vocabulary/types/word';

export type StoredWord = { word: Word; state: UserWordState };

/** Kayıt anahtarı = word.id ("apple", "uz:olma") */
const key = (v: string) => v.trim().toLowerCase();

const iso = (t: number | null) => (t == null ? undefined : new Date(t).toISOString());
const fromIso = (s: string | undefined) => {
  if (!s) {
    return null;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};

function toStored(r: Row): StoredWord {
  const word = JSON.parse(String(r.data)) as Word;
  word.lang = word.lang ?? 'en';
  const id = String(r.id);
  const c: SrsCard = r.c_id == null ? newCard('word', id, Number(r.created_at)) : rowToCard(r, 'c_');
  return {
    word,
    state: {
      wordId: word.id ?? id,
      isFavorite: Number(r.is_favorite) === 1,
      isLearned: Number(r.is_learned) === 1,
      reviewCount: c.reviewCount,
      correctCount: c.correctCount,
      wrongCount: c.wrongCount,
      learningStatus: c.status,
      reviewInterval: c.intervalDays,
      nextReviewAt: iso(c.dueAt),
      createdAt: new Date(Number(r.created_at)).toISOString(),
      lastReviewedAt: iso(c.lastReviewAt),
      reps: c.reps,
      lapses: c.lapses,
      ease: c.ease,
    },
  };
}

const SELECT = `SELECT w.*, ${cardSelect('c')} FROM user_words w
  LEFT JOIN srs_cards c ON c.id = 'word:' || w.id AND c.deleted = 0`;

// Silinmiş kelime yeniden eklenirse temiz başlar (favori/öğrenildi sıfırlanır)
const UPSERT_WORD = `INSERT INTO user_words
  (id, lang, data, is_favorite, is_learned, source_app, created_at, updated_at, deleted, dirty)
  VALUES (?, ?, ?, 0, 0, ?, ?, ?, 0, 1)
  ON CONFLICT(id) DO UPDATE SET
    data = excluded.data, lang = excluded.lang, updated_at = excluded.updated_at, dirty = 1,
    is_favorite = CASE WHEN user_words.deleted = 1 THEN 0 ELSE user_words.is_favorite END,
    is_learned = CASE WHEN user_words.deleted = 1 THEN 0 ELSE user_words.is_learned END,
    created_at = CASE WHEN user_words.deleted = 1 THEN excluded.created_at ELSE user_words.created_at END,
    deleted = 0`;

const ENSURE_CARD = `INSERT INTO srs_cards (id, item_type, item_id, app, created_at, updated_at, deleted, dirty)
  VALUES (?, 'word', ?, ?, ?, ?, 0, 1)
  ON CONFLICT(id) DO UPDATE SET
    deleted = 0, dirty = 1, updated_at = excluded.updated_at, reps = 0, lapses = 0, ease = 2.5,
    interval_days = 0, due_at = NULL, last_review_at = NULL, review_count = 0, correct_count = 0,
    wrong_count = 0, status = 'new', created_at = excluded.created_at
  WHERE srs_cards.deleted = 1`;

export const getStoredWord = async (wordId: string): Promise<StoredWord | null> => {
  const rows = await query(`${SELECT} WHERE w.id = ? AND w.deleted = 0`, [key(wordId)]);
  return rows.length ? toStored(rows[0]) : null;
};

/** Birden çok kelimeyi tek işlemde kaydeder (yeni kelime paketi eklerken). */
export const saveWords = async (words: Word[]) => {
  if (!words.length) {
    return;
  }
  const now = nowMs();
  await transaction(async exec => {
    for (const word of words) {
      const id = key(word.id);
      const lang = word.lang ?? 'en';
      await exec(UPSERT_WORD, [id, lang, JSON.stringify({ ...word, lang }), APP.key, now, now]);
      await exec(ENSURE_CARD, [cardId('word', id), id, APP.key, now, now]);
    }
  });
};

export const saveWord = async (word: Word): Promise<StoredWord> => {
  await saveWords([word]);
  return (await getStoredWord(word.id))!;
};

/**
 * Durum alanlarını günceller. Favori/öğrenildi → user_words,
 * tekrar alanları → srs_cards.
 */
export const updateWordState = async (wordId: string, changes: Partial<UserWordState>) => {
  const cur = await getStoredWord(wordId);
  if (!cur) {
    return null;
  }
  const id = key(wordId);
  const now = nowMs();
  const next: UserWordState = { ...cur.state, ...changes };
  // `nextReviewAt: undefined` açıkça verildiyse planı temizle
  const dueAt = 'nextReviewAt' in changes ? fromIso(changes.nextReviewAt) : fromIso(cur.state.nextReviewAt);
  const card: SrsCard = {
    ...newCard('word', id),
    reps: next.reps ?? 0,
    lapses: next.lapses ?? 0,
    ease: next.ease ?? 2.5,
    intervalDays: next.reviewInterval,
    dueAt,
    lastReviewAt: fromIso(next.lastReviewedAt),
    reviewCount: next.reviewCount,
    correctCount: next.correctCount,
    wrongCount: next.wrongCount,
    status: next.learningStatus,
    createdAt: fromIso(cur.state.createdAt) ?? now,
    updatedAt: now,
  };
  await transaction(async exec => {
    await exec('UPDATE user_words SET is_favorite = ?, is_learned = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
      next.isFavorite ? 1 : 0,
      next.isLearned ? 1 : 0,
      now,
      id,
    ]);
    await exec(UPSERT_CARD_SQL, cardParams(card));
  });
  return getStoredWord(wordId);
};

export const getAllStoredWords = async (): Promise<StoredWord[]> => {
  const rows = await query(`${SELECT} WHERE w.deleted = 0 ORDER BY w.created_at`);
  return rows.map(toStored);
};

export const getStoredWordIds = async () => {
  const rows = await query('SELECT id FROM user_words WHERE deleted = 0');
  return new Set(rows.map(r => String(r.id)));
};

/** Yumuşak silme: senkronda diğer cihazlara da "silindi" olarak gider. */
export const deleteWord = async (wordId: string) => {
  const id = key(wordId);
  const now = nowMs();
  await transaction(async exec => {
    await exec('UPDATE user_words SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?', [now, id]);
    await exec('UPDATE srs_cards SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?', [now, cardId('word', id)]);
  });
};
