"""
Özbekçe metin yardımcıları.

ÖNEMLİ: normalize() fonksiyonu, uygulamadaki
src/features/vocabulary/utils/normalize.ts ile BİREBİR aynı sonucu vermelidir.
Birini değiştirirseniz diğerini de değiştirin (tests/test_uz_text.py kontrol eder).
"""
import re
import unicodedata

# Kaynaklarda oʻ / gʻ / tutuq belgisi için görülen tüm kesme işareti varyantları
APOSTROPHES = "'\u2018\u2019\u02bb\u02bc\u02b9\u0060\u00b4"
_APOS_RE = re.compile("[" + re.escape(APOSTROPHES) + "]")

# Özbek Kiril -> Latin (küçük harf). 'е' ayrıca bağlama göre işlenir.
CYR2LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ё": "yo", "ж": "j",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "х": "x", "ц": "s", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "'", "ы": "i",
    "ь": "", "э": "e", "ю": "yu", "я": "ya", "ў": "o'", "қ": "q", "ғ": "g'",
    "ҳ": "h",
}
_VOWELS_CYR = set("аеёиоуэюяўъь")
_CYR_RE = re.compile("[\u0400-\u04ff]")


def has_cyrillic(s: str) -> bool:
    return bool(_CYR_RE.search(s))


def cyr_to_lat(s: str) -> str:
    """Özbek Kiril metni Latin'e çevirir (kesme işareti ASCII ' olarak)."""
    out = []
    prev = ""
    for ch in s:
        low = ch.lower()
        if low == "е":
            # kelime başında veya ünlüden sonra 'ye'
            lat = "ye" if (prev == "" or not prev.isalpha() or prev.lower() in _VOWELS_CYR) else "e"
        elif low in CYR2LAT:
            lat = CYR2LAT[low]
        else:
            lat = ch
            prev = ch
            out.append(lat)
            continue
        if ch != low and lat:
            lat = lat[0].upper() + lat[1:]
        out.append(lat)
        prev = ch
    return "".join(out)


def normalize(s: str) -> str:
    """Arama anahtarı: küçük harf, Kiril->Latin, tüm kesme işaretleri -> ', boşluklar sadeleşir."""
    s = unicodedata.normalize("NFC", s).lower()
    if has_cyrillic(s):
        s = cyr_to_lat(s)
    s = _APOS_RE.sub("'", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def to_display_uz(s: str) -> str:
    """Resmî Latin yazımına çevirir: oʻ gʻ (U+02BB), diğer kesme işaretleri ʼ (U+02BC)."""
    s = unicodedata.normalize("NFC", s).strip()
    if has_cyrillic(s):
        s = cyr_to_lat(s)
    s = re.sub("([oOgG])[" + re.escape(APOSTROPHES) + "]", "\\1\u02bb", s)
    s = re.sub("(?<![oOgG])[" + re.escape(APOSTROPHES) + "]", "\u02bc", s)
    return re.sub(r"\s+", " ", s)
