import { env } from '../config/env';

type R = { translated_text: string };
export type Lang = 'en' | 'uz';

const TILMOCH_CODES: Record<Lang, string> = { en: 'eng_Latn', uz: 'uzn_Latn' };

/** Aynı kelime için API'yi tekrar çağırmamak (kotayı korumak) için bellek içi önbellek */
const cache = new Map<string, string>();
const CACHE_LIMIT = 5000;

export const translate = async (text: string, from: Lang, to: Lang): Promise<string> => {
  if (!env.tilmochApiKey) {
    throw new Error('TILMOCH_API_KEY is missing');
  }
  const key = `${from}>${to}:${text}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const r = await fetch('https://websocket.tahrirchi.uz/translate-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: env.tilmochApiKey },
    body: JSON.stringify({
      text,
      source_lang: TILMOCH_CODES[from],
      target_lang: TILMOCH_CODES[to],
      model: 'tilmoch',
    }),
  });
  if (!r.ok) {
    throw new Error('Translation failed');
  }
  const d = (await r.json()) as R;
  const out = d.translated_text?.trim();
  if (!out) {
    throw new Error('Translation failed');
  }
  if (cache.size >= CACHE_LIMIT) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, out);
  return out;
};

/** Eski isim — geriye dönük uyumluluk için */
export const translateToUzbek = (text: string) => translate(text, 'en', 'uz');
