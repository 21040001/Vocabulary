#!/usr/bin/env python3
"""
İngilizce <-> Özbekçe kelime veritabanı üretici.

Kaynaklar (ikisi de ücretsiz, atıf zorunlu):
  * Wiktionary (kaikki.org wiktextract ham verisi)  — CC BY-SA 4.0
      - İngilizce maddelerdeki Özbekçe çeviriler  -> eng→uz
      - Özbekçe maddelerin İngilizce anlamları     -> uz→eng
  * Tatoeba cümle çiftleri                          — CC BY 2.0 FR
Kelime sıklığı: wordfreq kütüphanesi.

Çıktı: vocab.db (SQLite) — uygulamaya gömülür, salt okunur.

Kullanım:
    pip install -r requirements.txt
    python build_vocab_db.py                      # her şeyi indirir (~2.9 GB, bir kez)
    python build_vocab_db.py --wiktextract yerel.jsonl.gz --tatoeba-dir ./tatoeba
    python build_vocab_db.py --max-rank 10000     # sadece en sık 10.000 İngilizce kelime
"""
from __future__ import annotations

import argparse
import bz2
import collections
import csv
import datetime as dt
import gzip
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

from uz_text import cyr_to_lat, has_cyrillic, normalize, to_display_uz

WIKTEXTRACT_URL = "https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz"
TATOEBA_BASE = "https://downloads.tatoeba.org/exports/per_language"
TATOEBA_FILES = {
    "eng_sentences.tsv.bz2": f"{TATOEBA_BASE}/eng/eng_sentences.tsv.bz2",
    "uzb_sentences.tsv.bz2": f"{TATOEBA_BASE}/uzb/uzb_sentences.tsv.bz2",
    "uzb-eng_links.tsv.bz2": f"{TATOEBA_BASE}/uzb/uzb-eng_links.tsv.bz2",
}

# Öğretilmeyecek kelime türleri
SKIP_POS = {"name", "character", "symbol", "suffix", "prefix", "infix", "affix",
            "punct", "abbrev", "romanization", "proverb"}
SKIP_SENSE_TAGS = {"form-of", "alt-of", "misspelling", "obsolete", "archaic", "abbreviation"}

EN_WORD_RE = re.compile(r"^[A-Za-z][A-Za-z' \-]{0,38}$")
UZ_WORD_RE = re.compile(r"^[A-Za-zʻʼ'\- ]{1,40}$")
PAREN_RE = re.compile(r"\([^)]*\)|\[[^\]]*\]")

MAX_EXAMPLES_PER_TRANSLATION = 3


# ----------------------------------------------------------------- yardımcılar
def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def stable_id(*parts: str) -> int:
    """Yeniden üretimlerde değişmeyen, JS'te güvenli (<2^52) tam sayı kimlik."""
    h = hashlib.sha1("\x1f".join(parts).encode("utf-8")).hexdigest()
    return int(h[:13], 16)


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        log(f"önbellekte var: {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    log(f"indiriliyor: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "vocab-db-builder/1.0"})
    with urllib.request.urlopen(req) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        done, last = 0, 0.0
        while chunk := r.read(1 << 20):
            f.write(chunk)
            done += len(chunk)
            if time.time() - last > 5:
                pct = f"{done * 100 / total:.1f}%" if total else ""
                log(f"  {done >> 20} MB {pct}")
                last = time.time()
    tmp.rename(dest)
    return dest


def clean_uz(raw: str) -> tuple[str, str | None] | None:
    """(Latin görünen yazım, varsa Kiril orijinal) döndürür; uygun değilse None."""
    s = PAREN_RE.sub("", raw or "").strip()
    if not s:
        return None
    cyr = s if has_cyrillic(s) else None
    disp = to_display_uz(s)
    if not UZ_WORD_RE.match(disp) or len(disp.split()) > 4:
        return None
    return disp, cyr


def clean_en(raw: str) -> str | None:
    s = PAREN_RE.sub("", raw or "").strip()
    s = re.sub(r"\s+", " ", s)
    if not EN_WORD_RE.match(s) or len(s.split()) > 3:
        return None
    return s


def gloss_to_english(gloss: str, pos: str) -> list[str]:
    """'apple; apple tree' -> ['apple', 'apple tree'];  'to read' (verb) -> ['read']."""
    g = PAREN_RE.sub("", gloss)
    out = []
    for part in re.split(r"[;,]", g):
        p = part.strip().rstrip(".")
        if pos == "verb" and p.lower().startswith("to "):
            p = p[3:]
        if p.lower().startswith(("a ", "an ")) and pos == "noun":
            p = p.split(" ", 1)[1]
        en = clean_en(p)
        if en:
            out.append(en)
    return out[:4]


# ------------------------------------------------------------ wiktionary okuma
def iter_wiktextract(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if i % 1_000_000 == 0:
                log(f"  {i:,} satır tarandı")
            # Hızlı ön filtre: Özbekçe ile ilgisi olmayan satırları JSON'a hiç çevirme
            if '"uz"' not in line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def extract_pairs(wiktextract: Path):
    """(en, uz_display, uz_cyrillic, pos, sense, source) kümeleri üretir."""
    pairs = []
    n_en = n_uz = 0
    for obj in iter_wiktextract(wiktextract):
        lc = obj.get("lang_code")
        pos = obj.get("pos") or ""
        if pos in SKIP_POS:
            continue

        if lc == "en":
            en = clean_en(obj.get("word", ""))
            if not en:
                continue
            trs = list(obj.get("translations") or [])
            for s in obj.get("senses") or []:
                trs.extend(s.get("translations") or [])
            for t in trs:
                if (t.get("lang_code") or t.get("code")) != "uz":
                    continue
                uz = clean_uz(t.get("word", ""))
                if uz:
                    pairs.append((en, uz[0], uz[1], pos, (t.get("sense") or "")[:200], "wiktionary-en"))
                    n_en += 1

        elif lc == "uz":
            uz = clean_uz(obj.get("word", ""))
            if not uz:
                continue
            for s in obj.get("senses") or []:
                if SKIP_SENSE_TAGS & set(s.get("tags") or []):
                    continue
                glosses = s.get("glosses") or []
                if not glosses:
                    continue
                gloss = glosses[-1]  # alt anlamlarda en spesifik olan sonuncudur
                for en in gloss_to_english(gloss, pos):
                    pairs.append((en, uz[0], uz[1], pos, gloss[:200], "wiktionary-uz"))
                    n_uz += 1
    log(f"Wiktionary: {n_en:,} eng→uz, {n_uz:,} uz→eng çift bulundu")
    return pairs


# --------------------------------------------------------------- sıklık sırası
def frequency_ranks(words: list[str], lang: str) -> dict[str, int]:
    try:
        from wordfreq import available_languages, zipf_frequency
    except ImportError:
        log("UYARI: wordfreq kurulu değil, sıklık sırası boş kalacak")
        return {}
    if lang not in available_languages():
        return {}
    scored = [(zipf_frequency(w, lang), w) for w in words]
    scored = [x for x in scored if x[0] > 0]
    scored.sort(key=lambda x: (-x[0], x[1]))
    return {w: i + 1 for i, (_, w) in enumerate(scored)}


# ----------------------------------------------------------------- tatoeba
def read_tatoeba(tdir: Path):
    def sentences(fn):
        with bz2.open(tdir / fn, "rt", encoding="utf-8") as f:
            return {int(r[0]): r[2] for r in csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE) if len(r) >= 3}

    uzb = sentences("uzb_sentences.tsv.bz2")
    eng = sentences("eng_sentences.tsv.bz2")
    examples = {}
    with bz2.open(tdir / "uzb-eng_links.tsv.bz2", "rt", encoding="utf-8") as f:
        for r in csv.reader(f, delimiter="\t"):
            if len(r) < 2:
                continue
            a, b = int(r[0]), int(r[1])
            if a in uzb and b in eng and a not in examples:
                examples[a] = (eng[b], to_display_uz(uzb[a]))
    log(f"Tatoeba: {len(examples):,} uz–eng cümle çifti")
    return examples


TOKEN_RE = re.compile(r"[a-z']+")


def tokens(s: str) -> list[str]:
    return TOKEN_RE.findall(normalize(s))


def en_matches(word_norm: str, toks: list[str], text_norm: str) -> bool:
    if " " in word_norm:
        return f" {word_norm} " in f" {text_norm} "
    forms = {word_norm, word_norm + "s", word_norm + "es", word_norm + "ed", word_norm + "ing", word_norm + "d"}
    return any(t in forms for t in toks)


def uz_matches(word_norm: str, toks: list[str], text_norm: str) -> bool:
    if " " in word_norm:
        return word_norm in text_norm
    # Özbekçe eklemeli: 'kitob' -> 'kitobni', 'kitoblar'
    if len(word_norm) >= 3:
        return any(t.startswith(word_norm) for t in toks)
    return word_norm in toks


# ----------------------------------------------------------------- veritabanı
SCHEMA = """
PRAGMA page_size = 4096;
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID;
CREATE TABLE words (
  id INTEGER PRIMARY KEY,          -- kararlı: hash(lang, text_norm)
  lang TEXT NOT NULL CHECK (lang IN ('en','uz')),
  text TEXT NOT NULL,              -- görünen yazım (uz: resmî Latin, oʻ gʻ)
  text_norm TEXT NOT NULL,         -- arama anahtarı (normalize.ts ile aynı)
  text_cyrillic TEXT,              -- uz için biliniyorsa Kiril yazılış
  freq_rank INTEGER                -- 1 = en sık; NULL = bilinmiyor
);
CREATE UNIQUE INDEX idx_words_lang_norm ON words(lang, text_norm);
CREATE INDEX idx_words_rank ON words(lang, freq_rank);

CREATE TABLE translations (
  id INTEGER PRIMARY KEY,          -- kararlı: hash(en_id, uz_id, pos)
  en_id INTEGER NOT NULL REFERENCES words(id),
  uz_id INTEGER NOT NULL REFERENCES words(id),
  pos TEXT,                        -- noun, verb, adj ...
  sense TEXT,                      -- hangi anlam (İngilizce açıklama)
  source TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1   -- 1: insan yazımı kaynak, 0: makine çevirisi
);
CREATE INDEX idx_tr_en ON translations(en_id);
CREATE INDEX idx_tr_uz ON translations(uz_id);

CREATE TABLE examples (id INTEGER PRIMARY KEY, en TEXT NOT NULL, uz TEXT NOT NULL);
CREATE TABLE translation_examples (
  translation_id INTEGER NOT NULL,
  example_id INTEGER NOT NULL,
  PRIMARY KEY (translation_id, example_id)
) WITHOUT ROWID;
"""


def build(args) -> None:
    cache = Path(args.cache_dir)
    wikt = Path(args.wiktextract) if args.wiktextract else download(WIKTEXTRACT_URL, cache / "raw-wiktextract-data.jsonl.gz")

    log("Wiktionary taranıyor (ilk çalıştırmada 10-30 dk sürebilir)…")
    raw_pairs = extract_pairs(wikt)

    # --- kelimeleri ve çevirileri tekilleştir
    en_words: dict[str, str] = {}               # norm -> görünen
    uz_words: dict[str, tuple[str, str | None]] = {}
    trans: dict[tuple[str, str, str], dict] = {}
    for en, uz, uz_cyr, pos, sense, source in raw_pairs:
        en_n, uz_n = normalize(en), normalize(uz)
        if not en_n or not uz_n:
            continue
        # Özel isim değilse küçük harfli yazımı tercih et
        if en_n not in en_words or (en_words[en_n][0].isupper() and not en[0].isupper()):
            en_words[en_n] = en
        prev = uz_words.get(uz_n)
        if prev is None:
            uz_words[uz_n] = (uz, uz_cyr)
        else:
            disp = uz if (prev[0][0].isupper() and not uz[0].isupper()) else prev[0]
            uz_words[uz_n] = (disp, prev[1] or uz_cyr)
        key = (en_n, uz_n, pos)
        if key not in trans:
            trans[key] = {"sense": sense, "sources": {source}}
        else:
            trans[key]["sources"].add(source)
            if not trans[key]["sense"] and sense:
                trans[key]["sense"] = sense

    log("Sıklık sıraları hesaplanıyor…")
    en_rank = frequency_ranks(list(en_words), "en")
    uz_rank = frequency_ranks(list(uz_words), "uz")

    if args.max_rank:
        keep = {w for w, r in en_rank.items() if r <= args.max_rank}
        trans = {k: v for k, v in trans.items() if k[0] in keep}
        used_en = {k[0] for k in trans}
        used_uz = {k[1] for k in trans}
        en_words = {k: v for k, v in en_words.items() if k in used_en}
        uz_words = {k: v for k, v in uz_words.items() if k in used_uz}

    if not uz_rank:
        # wordfreq Özbekçe'yi desteklemiyorsa: en sık İngilizce karşılığının sırası
        for (en_n, uz_n, _), _v in trans.items():
            r = en_rank.get(en_n)
            if r and (uz_n not in uz_rank or r < uz_rank[uz_n]):
                uz_rank[uz_n] = r

    # --- yaz
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    db = sqlite3.connect(out)
    db.executescript(SCHEMA)

    db.executemany(
        "INSERT INTO words(id, lang, text, text_norm, text_cyrillic, freq_rank) VALUES (?,?,?,?,?,?)",
        [(stable_id("en", n), "en", t, n, None, en_rank.get(n)) for n, t in en_words.items()]
        + [(stable_id("uz", n), "uz", t, n, c, uz_rank.get(n)) for n, (t, c) in uz_words.items()],
    )
    tr_rows = []
    for (en_n, uz_n, pos), v in trans.items():
        en_id, uz_id = stable_id("en", en_n), stable_id("uz", uz_n)
        src = "+".join(sorted(v["sources"]))
        tr_rows.append((stable_id(str(en_id), str(uz_id), pos), en_id, uz_id, pos or None, v["sense"] or None, src, 1))
    db.executemany("INSERT INTO translations VALUES (?,?,?,?,?,?,?)", tr_rows)
    log(f"{len(en_words):,} İngilizce, {len(uz_words):,} Özbekçe kelime, {len(tr_rows):,} çeviri")

    # --- örnek cümleler
    n_links = 0
    if not args.no_examples:
        tdir = Path(args.tatoeba_dir) if args.tatoeba_dir else cache / "tatoeba"
        if not args.tatoeba_dir:
            for fn, url in TATOEBA_FILES.items():
                download(url, tdir / fn)
        examples = read_tatoeba(tdir)
        ex_tok = {}
        en_index = collections.defaultdict(set)
        for ex_id, (en_s, uz_s) in examples.items():
            et, ut = tokens(en_s), tokens(uz_s)
            ex_tok[ex_id] = (et, normalize(en_s), ut, normalize(uz_s), len(en_s))
            for t in et:
                en_index[t].add(ex_id)
        links, used = [], set()
        for (en_n, uz_n, _), (tr_id, *_rest) in zip(trans.keys(), tr_rows):
            first = en_n.split()[0]
            cands = set()
            for form in (first, first + "s", first + "es", first + "ed", first + "ing", first + "d"):
                cands |= en_index.get(form, set())
            hits = [e for e in cands
                    if en_matches(en_n, ex_tok[e][0], ex_tok[e][1]) and uz_matches(uz_n, ex_tok[e][2], ex_tok[e][3])]
            hits.sort(key=lambda e: ex_tok[e][4])  # kısa cümleler önce
            for e in hits[:MAX_EXAMPLES_PER_TRANSLATION]:
                links.append((tr_id, e))
                used.add(e)
        db.executemany("INSERT INTO examples VALUES (?,?,?)", [(e, *examples[e]) for e in sorted(used)])
        db.executemany("INSERT INTO translation_examples VALUES (?,?)", links)
        n_links = len(links)
        log(f"{len(used):,} örnek cümle, {n_links:,} çeviri–cümle bağlantısı")

    version = args.version or dt.datetime.now().strftime("%Y%m%d%H")
    meta = {
        "version": str(version),
        "built_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "attribution": "Wiktionary (CC BY-SA 4.0, via kaikki.org/wiktextract); Tatoeba (CC BY 2.0 FR)",
        "en_words": str(len(en_words)),
        "uz_words": str(len(uz_words)),
        "translations": str(len(tr_rows)),
        "example_links": str(n_links),
    }
    db.executemany("INSERT INTO meta VALUES (?,?)", meta.items())
    uv = int(version) if str(version).isdigit() and int(version) < 2**31 else 0
    db.execute(f"PRAGMA user_version = {uv}")
    db.commit()
    db.execute("VACUUM")
    db.close()
    log(f"Bitti: {out}  ({out.stat().st_size / 1e6:.1f} MB, sürüm {version})")
    log(f"Uygulamadaki VOCAB_DB_VERSION değerini '{version}' yapmayı unutmayın.")


def main(argv=None) -> None:
    here = Path(__file__).resolve().parent
    root = here.parent.parent
    p = argparse.ArgumentParser(description="İngilizce–Özbekçe kelime veritabanı üretir")
    p.add_argument("--wiktextract", help="yerel raw-wiktextract-data.jsonl(.gz) yolu (yoksa indirilir)")
    p.add_argument("--tatoeba-dir", help="Tatoeba .tsv.bz2 dosyalarının klasörü (yoksa indirilir)")
    p.add_argument("--cache-dir", default=str(here / ".cache"))
    p.add_argument("--out", default=str(root / "assets" / "db" / "vocab.db"))
    p.add_argument("--max-rank", type=int, default=0, help="sadece en sık N İngilizce kelime (0 = hepsi)")
    p.add_argument("--no-examples", action="store_true", help="Tatoeba örnek cümlelerini atla")
    p.add_argument("--version", help="veritabanı sürümü (varsayılan: YYYYMMDDHH)")
    build(p.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
