/**
 * Arama normalizasyonu.
 *
 * ÖNEMLİ: scripts/data-pipeline/uz_text.py içindeki normalize() ile BİREBİR
 * aynı sonucu vermelidir; veritabanındaki `text_norm` sütunu onunla üretildi.
 * Birini değiştirirseniz diğerini de değiştirin.
 *
 *   "Oʻzbek"  "O'zbek"  "O‘zbek"  "Ўзбек"  ->  "o'zbek"
 */

// oʻ / gʻ / tutuq belgisi için kaynaklarda görülen tüm varyantlar
const APOSTROPHES = /['‘’ʻʼʹ`´]/g;
const CYRILLIC = /[Ѐ-ӿ]/;

const CYR2LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'",
  ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
};
const VOWELS_CYR = new Set('аеёиоуэюяўъь');
const LETTER = /\p{L}/u;

export function hasCyrillic(s: string): boolean {
  return CYRILLIC.test(s);
}

/** Özbek Kiril -> Latin (kesme işareti ASCII '). */
export function cyrToLat(s: string): string {
  let out = '';
  let prev = '';
  for (const ch of s) {
    const low = ch.toLowerCase();
    let lat: string;
    if (low === 'е') {
      lat =
        prev === '' || !LETTER.test(prev) || VOWELS_CYR.has(prev.toLowerCase())
          ? 'ye'
          : 'e';
    } else if (low in CYR2LAT) {
      lat = CYR2LAT[low];
    } else {
      out += ch;
      prev = ch;
      continue;
    }
    if (ch !== low && lat) {
      lat = lat[0].toUpperCase() + lat.slice(1);
    }
    out += lat;
    prev = ch;
  }
  return out;
}

/** Veritabanındaki `text_norm` ile karşılaştırılacak arama anahtarı. */
export function normalize(s: string): string {
  let r = s.normalize('NFC').toLowerCase();
  if (hasCyrillic(r)) {
    r = cyrToLat(r);
  }
  return r.replace(APOSTROPHES, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Önek araması için üst sınır: `text_norm >= q AND text_norm < upper(q)`.
 * LIKE yerine bu kullanılır çünkü index'i kullanır ve büyük/küçük harf sorunu yoktur.
 */
export function prefixUpperBound(prefix: string): string {
  return prefix + '￿';
}
