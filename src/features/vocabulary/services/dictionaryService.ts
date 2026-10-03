/**
 * Yerel sözlük sorguları (vocab.db). İnternet gerektirmez.
 * Her iki yön (en→uz, uz→en) aynı `translations` tablosundan çalışır.
 */
import { getVocabDb } from '../../../services/database/vocabDb';
import { Lang, makeWordId, Word, WordExample } from '../types/word';
import { normalize, prefixUpperBound } from '../utils/normalize';
import { TranslationGroup} from '../types/word';

export type Suggestion = {
  word: string;
  lang: Lang;
  translations: string[];
};

type Row = Record<string, unknown>;

const SIDE: Record<Lang, { self: string; other: string }> = {
  en: { self: 'en_id', other: 'uz_id' },
  uz: { self: 'uz_id', other: 'en_id' },
};
const MAX_TRANSLATIONS = 5;
const MAX_EXAMPLES = 3;
const placeholders = (n: number) => Array(n).fill('?').join(',');

type Tr = { tid: number; text: string; pos: string | null };

function groupByPos(list: Tr[]): TranslationGroup[] {
  const groups: TranslationGroup[] = [];
  for (const t of list) {
    let g = groups.find(x => x.pos === t.pos);
    if (!g) {
      g = { pos: t.pos, translations: [] };
      groups.push(g);
    }
    if (!g.translations.includes(t.text)) {
      g.translations.push(t.text);
    }
  }
  return groups;
}

const uniqueTexts = (list: Tr[]) => [...new Set(list.map(x => x.text))];
let ipaExpr: string | null = null;
async function ipaColumn(): Promise<string> {
  if (ipaExpr === null) {
    const db = await getVocabDb();
    const { rows } = await db.execute('PRAGMA table_info(words)');
    ipaExpr = rows.some(r => r.name === 'ipa') ? 'ipa' : 'NULL';
  }
  return ipaExpr;
}
/** wordId -> karşı dildeki çeviriler (önce insan yazımı, sonra sık kullanılan) */
async function translationsFor(lang: Lang, ids: number[]) {
  const out = new Map<number, Tr[]>();
  if (!ids.length) {
    return out;
  }
  const { self, other } = SIDE[lang];
  const db = await getVocabDb();
  const { rows } = await db.execute(
    `SELECT t.id AS tid, t.${self} AS src, t.pos, o.text
       FROM translations t JOIN words o ON o.id = t.${other}
      WHERE t.${self} IN (${placeholders(ids.length)})
      ORDER BY t.verified DESC, COALESCE(o.freq_rank, 1e9), o.text`,
    ids,
  );
  for (const r of rows) {
    const src = Number(r.src);
    const list = out.get(src) ?? [];
    const text = String(r.text);
    const pos = (r.pos as string | null) ?? null;
    const known = list.some(x => x.text === text);
    if ((known || uniqueTexts(list).length < MAX_TRANSLATIONS) && !list.some(x => x.text === text && x.pos === pos)) {
      list.push({ tid: Number(r.tid), text, pos });
    }
    out.set(src, list);
  }
  return out;
}

async function examplesFor(translationIds: number[]): Promise<WordExample[]> {
  if (!translationIds.length) {
    return [];
  }
  const db = await getVocabDb();
  const { rows } = await db.execute(
    `SELECT DISTINCT e.en, e.uz FROM translation_examples te
       JOIN examples e ON e.id = te.example_id
      WHERE te.translation_id IN (${placeholders(translationIds.length)})
      ORDER BY length(e.en) LIMIT ${MAX_EXAMPLES}`,
    translationIds,
  );
  return rows.map(r => ({ en: String(r.en), uz: String(r.uz) }));
}

function toWord(r: Row, lang: Lang, tr: Tr[], examples: WordExample[] = []): Word {
  return {
    id: makeWordId(lang, String(r.text_norm)),
    word: String(r.text),
    lang,
    translations: uniqueTexts(tr),
    translationGroups: groupByPos(tr),
    pronunciation: r.ipa ? String(r.ipa) : undefined,
    meanings: [],
    examples,
    source: 'dictionary',
  };
}

/** Yazarken öneriler: "app" -> apple, application… Tam eşleşme en üstte. */
export async function searchSuggestions(query: string, lang: Lang, limit = 8): Promise<Suggestion[]> {
  const q = normalize(query);
  if (!q) {
    return [];
  }
  const db = await getVocabDb();
  const { self } = SIDE[lang];
  const { rows } = await db.execute(
    `SELECT w.id, w.text FROM words w
      WHERE w.lang = ? AND w.text_norm >= ? AND w.text_norm < ?
        AND EXISTS (SELECT 1 FROM translations t WHERE t.${self} = w.id)
      ORDER BY (w.text_norm = ?) DESC, COALESCE(w.freq_rank, 1e9), length(w.text_norm)
      LIMIT ?`,
    [lang, q, prefixUpperBound(q), q, limit],
  );
  const tr = await translationsFor(lang, rows.map(r => Number(r.id)));
  return rows.map(r => ({
    word: String(r.text),
    lang,
    translations: uniqueTexts(tr.get(Number(r.id)) ?? []).slice(0, 3),
  }));
}

/** Tam eşleşme. Bulunamazsa null (o zaman backend'e sorulur). */
export async function lookupWord(text: string, lang: Lang): Promise<Word | null> {
  const q = normalize(text);
  if (!q) {
    return null;
  }
  const db = await getVocabDb();
  const { rows } = await db.execute(
    `SELECT id, text, text_norm, ${await ipaColumn()} AS ipa FROM words WHERE lang = ? AND text_norm = ?`,
    [lang, q], 
  );
  if (!rows.length) {
    return null;
  }
  const id = Number(rows[0].id);
  const tr = (await translationsFor(lang, [id])).get(id) ?? [];
  if (!tr.length) {
    return null;
  }
  const examples = await examplesFor(tr.map(x => x.tid));
  return toWord(rows[0], lang, tr, examples);
}

/**
 * Öğrenilecek yeni kelimeler: en sık kullanılandan başlayarak,
 * `exclude` içindeki (zaten kayıtlı) kelimeleri atlar.
 */
export async function getFrequentWords(lang: Lang, count: number, exclude: Set<string>): Promise<Word[]> {
  const db = await getVocabDb();
  const { self } = SIDE[lang];
  const picked: Row[] = [];
  const pageSize = Math.max(50, count * 4);
  for (let offset = 0; picked.length < count && offset < 20000; offset += pageSize) {
    const { rows } = await db.execute(
     `SELECT w.id, w.text, w.text_norm, ${await ipaColumn()} AS ipa FROM words w
        WHERE w.lang = ? AND w.freq_rank IS NOT NULL
          AND EXISTS (SELECT 1 FROM translations t WHERE t.${self} = w.id)
        ORDER BY w.freq_rank LIMIT ? OFFSET ?`,
      [lang, pageSize, offset],
    );
    if (!rows.length) {
      break;
    }
    for (const r of rows) {
      if (picked.length < count && !exclude.has(makeWordId(lang, String(r.text_norm)))) {
        picked.push(r);
      }
    }
  }
  const tr = await translationsFor(lang, picked.map(r => Number(r.id)));
  const words: Word[] = [];
  for (const r of picked) {
    const t = tr.get(Number(r.id)) ?? [];
    words.push(toWord(r, lang, t, await examplesFor(t.map(x => x.tid))));
  }
  return words;
}
