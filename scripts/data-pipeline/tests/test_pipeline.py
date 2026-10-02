"""
Uçtan uca test: küçük sahte Wiktionary + Tatoeba verisiyle vocab.db üretir ve kontrol eder.
    cd scripts/data-pipeline && python -m pytest tests -q     (veya: python tests/test_pipeline.py)
"""
import bz2
import gzip
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import build_vocab_db  # noqa: E402
from uz_text import normalize, to_display_uz  # noqa: E402

WIKT = [
    # İngilizce madde, çeviriler üst düzeyde (yeni format, lang_code)
    {"word": "apple", "lang_code": "en", "pos": "noun", "senses": [{"glosses": ["fruit"]}],
     "translations": [{"lang_code": "uz", "word": "olma", "sense": "fruit"},
                      {"lang_code": "tr", "word": "elma"}]},
    # Eski format: çeviriler sense içinde, 'code' alanı, Kiril çeviri
    {"word": "book", "lang_code": "en", "pos": "noun",
     "senses": [{"glosses": ["printed work"],
                 "translations": [{"code": "uz", "word": "китоб", "sense": "printed work"}]}]},
    {"word": "son", "lang_code": "en", "pos": "noun", "senses": [],
     "translations": [{"lang_code": "uz", "word": "o‘g‘il"}]},
    {"word": "read", "lang_code": "en", "pos": "verb", "senses": [],
     "translations": [{"lang_code": "uz", "word": "oʻqimoq"}]},
    {"word": "Tashkent", "lang_code": "en", "pos": "name", "senses": [],
     "translations": [{"lang_code": "uz", "word": "Toshkent"}]},
    # Özbekçe maddeler
    {"word": "o'qimoq", "lang_code": "uz", "pos": "verb",
     "senses": [{"glosses": ["to read; to study"]}]},
    {"word": "kitob", "lang_code": "uz", "pos": "noun",
     "senses": [{"glosses": ["book"]}, {"glosses": ["kitoblar"], "tags": ["form-of"]}]},
    {"word": "suv", "lang_code": "uz", "pos": "noun",
     "senses": [{"glosses": ["water (liquid)"]}]},
    {"word": "uy", "lang_code": "uz", "pos": "noun",
     "senses": [{"glosses": ["A very long explanatory definition of a house"]}]},
]

TAT_UZ = [(1, "uzb", "Men kitobni o‘qiyapman."), (2, "uzb", "Bu olma juda shirin."),
          (3, "uzb", "Suv ich.")]
TAT_EN = [(10, "eng", "I am reading the book."), (20, "eng", "This apple is very sweet."),
          (30, "eng", "Drink water.")]
LINKS = [(1, 10), (2, 20), (3, 30)]


def write_fixtures(d: Path):
    with gzip.open(d / "wikt.jsonl.gz", "wt", encoding="utf-8") as f:
        for o in WIKT:
            f.write(json.dumps(o, ensure_ascii=False) + "\n")
        f.write('{"word": "ignored", "lang_code": "de"}\n')
    t = d / "tat"
    t.mkdir()
    for fn, rows in [("uzb_sentences.tsv.bz2", TAT_UZ), ("eng_sentences.tsv.bz2", TAT_EN),
                     ("uzb-eng_links.tsv.bz2", LINKS)]:
        with bz2.open(t / fn, "wt", encoding="utf-8") as f:
            for r in rows:
                f.write("\t".join(map(str, r)) + "\n")


def test_normalize():
    assert normalize("Oʻzbek") == normalize("O'zbek") == normalize("O‘zbek") == normalize("Ўзбек") == "o'zbek"
    assert normalize("китоб") == "kitob"
    assert normalize("Ер") == "yer" and normalize("тел") == "tel"
    assert to_display_uz("o'g'il") == "oʻgʻil"
    assert to_display_uz("ma'no") == "maʼno"


def test_build():
    with tempfile.TemporaryDirectory() as tmp:
        d = Path(tmp)
        write_fixtures(d)
        out = d / "vocab.db"
        build_vocab_db.main(["--wiktextract", str(d / "wikt.jsonl.gz"), "--tatoeba-dir", str(d / "tat"),
                             "--out", str(out), "--version", "2026100200"])
        db = sqlite3.connect(out)
        q = lambda sql, *a: db.execute(sql, a).fetchall()

        # eng -> uz
        rows = q("""SELECT o.text FROM words w JOIN translations t ON t.en_id=w.id
                    JOIN words o ON o.id=t.uz_id WHERE w.lang='en' AND w.text_norm='book'""")
        assert rows == [("kitob",)], rows
        # Kiril kaynağın orijinali saklanmış
        assert q("SELECT text_cyrillic FROM words WHERE lang='uz' AND text_norm='kitob'") == [("китоб",)]
        # iki kaynaktan gelen aynı çift tekilleşmiş
        assert q("SELECT source FROM translations t JOIN words w ON w.id=t.en_id WHERE w.text_norm='book'") \
            == [("wiktionary-en+wiktionary-uz",)]
        # uz -> eng, fiil 'to' öneki atılmış, farklı kesme işaretleri tek kelimede birleşmiş
        rows = q("""SELECT o.text FROM words w JOIN translations t ON t.uz_id=w.id
                    JOIN words o ON o.id=t.en_id WHERE w.lang='uz' AND w.text_norm=?
                    ORDER BY o.text""", normalize("oʻqimoq"))
        assert rows == [("read",), ("study",)], rows
        assert q("SELECT text FROM words WHERE lang='uz' AND text_norm=?", normalize("o'g'il")) == [("oʻgʻil",)]
        # özel isim, uzun tanım, form-of atlanmış
        assert not q("SELECT 1 FROM words WHERE text_norm IN ('tashkent','toshkent','kitoblar')")
        assert not q("SELECT 1 FROM words WHERE lang='en' AND text LIKE 'A very%'")
        # parantez temizlenmiş
        assert q("SELECT 1 FROM words WHERE lang='en' AND text='water'")
        # örnek cümleler: 'book'<->'kitob' cümlesi (kitobni = ek almış hâli) bağlanmış
        rows = q("""SELECT e.uz FROM translations t JOIN words w ON w.id=t.en_id
                    JOIN translation_examples te ON te.translation_id=t.id
                    JOIN examples e ON e.id=te.example_id WHERE w.text_norm='book'""")
        assert rows == [("Men kitobni oʻqiyapman.",)], rows
        assert q("SELECT value FROM meta WHERE key='version'") == [("2026100200",)]
        assert q("PRAGMA user_version") == [(2026100200,)]
        # kimlikler kararlı ve JS için güvenli
        assert all(i < 2**53 for (i,) in q("SELECT id FROM words"))
        assert q("SELECT id FROM words WHERE lang='en' AND text_norm='apple'")[0][0] == build_vocab_db.stable_id("en", "apple")
        db.close()



if __name__ == "__main__":
    test_normalize()
    test_build()
    print("OK")
