# src/core — seri için ortak çekirdek

Vocabulary, Grammar, Listening, Reading, Writing uygulamalarının **hepsinde aynı** olacak kod.
Kelime uygulamasına özel hiçbir şey import etmez. İleride `packages/core` olarak ortak pakete taşınacak.

```
core/
  config.ts            SUITE (marka, gizlilik adresi), APP (bu uygulamanın anahtarı), API_URL
  db/schema.ts         user.db şeması (sürümlü göçler)
  db/userDb.ts         bağlantı + query/run/transaction yardımcıları
  db/legacy.ts         eski AsyncStorage verisinin tek seferlik aktarımı (sadece Vocabulary'de iş yapar)
  srs/sm2.ts           SM-2 hesaplama (saf fonksiyonlar): again / hard / good / easy
  srs/cards.ts         srs_cards tablosu: reviewItem('grammar', 'present-simple', 'good')
  progress/activity.ts günlük aktivite, seri, hedef (tüm uygulamaların toplamı)
  profile/profile.ts   ortak profil: günlük hedef, CEFR seviyesi (A1–C1)
  backup/backup.ts     yedek dosya biçimi + birleştirme (son yazan kazanır)
  backup/backupFile.ts dosya seçici ile kaydet / yükle
```

## Veri modeli (user.db)

| Tablo | Ne | Ortak mı |
|---|---|---|
| `kv` | profil (`profile.*`), cihaza özel bayraklar (`local.*`, yedeğe girmez) | ✔ |
| `user_words` | kullanıcının kelime listesi (`source_app` = hangi uygulamada eklendi) | ✔ |
| `srs_cards` | tekrar kartları, `item_type` = word / grammar / listening … | ✔ |
| `activity` | gün × uygulama başına çözülen soru sayısı | ✔ (seri toplanır) |

Her satırda `updated_at` (ms), `dirty` (sunucuya gitmedi) ve gerekirse `deleted` (yumuşak silme) var.
Bu, Aşama 2'deki senkron için hazırlık: istemci `dirty = 1` satırları gönderir, sunucu
`updated_at`'e göre birleştirir (yedek geri yüklemeyle aynı kural), yeni satırları geri yollar.

## Yeni bir uygulamada kullanmak

1. `core/` klasörünü kopyalayın (ileride paket olarak gelecek).
2. `config.ts` → `APP.key` (örn. `'grammar'`), `APP.name`, `APP.version`.
3. Soru cevaplanınca:
   ```ts
   await recordActivity(isCorrect);                 // ortak seri / hedef
   await reviewItem('grammar', ruleId, 'good');     // ortak tekrar sistemi
   ```
4. Kelime listesine eklemek için `user_words` tablosuna `source_app = 'grammar'` ile yazın.

> Ayrı Play Store uygulamaları birbirinin dosyalarını okuyamaz. "Ortak" veriler cihazlar ve
> uygulamalar arasında **sunucu senkronu** (Aşama 2) ile birleşecek; o zamana kadar yedek dosyası
> bir uygulamadan diğerine taşınabilir.
