# Yerel sözlük — kurulum ve değişiklikler

## Ne değişti?

Uygulama artık kelimeyi **önce telefondaki sözlükte** (vocab.db) arıyor:

```
Kullanıcı arar
  ├─ Daha önce kaydedildiyse → cihazdaki kayıt
  ├─ Yerel sözlükte varsa   → çeviri + örnek cümleler (internetsiz)
  │                           + backend'den sadece tanım/telaffuz/ses
  └─ Yerelde yoksa          → backend (Tilmoch makine çevirisi)
```

Bunun faydaları:
- Sözlükteki kelimeler için ücretli Tilmoch API'si **hiç çağrılmaz** (`translate=0`).
- İnternet yokken de arama ve quiz çalışır.
- Özbekçe → İngilizce yönü eklendi.

### Dosya dosya

| Dosya | Değişiklik |
|---|---|
| `src/services/database/vocabDb.ts` | **Yeni.** vocab.db'yi açar, sürüm değişince yenisini kopyalar |
| `src/features/vocabulary/services/dictionaryService.ts` | **Yeni.** Yerel arama, öneriler, sık kelime listesi |
| `src/features/vocabulary/utils/normalize.ts` | **Yeni.** oʻ/o'/o‘ ve Kiril yazımları eşitler |
| `src/features/vocabulary/hooks/useSuggestions.ts` | **Yeni.** Yazarken öneri |
| `components/DirectionToggle.tsx`, `SuggestionList.tsx` | **Yeni.** EN→UZ / UZ→EN seçici, öneri listesi |
| `services/wordService.ts` | Yerel → backend sırası, 6 sn zaman aşımı, iOS için `localhost` |
| `screens/HomeScreen.tsx` | Yön seçici, canlı öneriler, klavyeden "ara", "Details →" |
| `screens/QuizScreen.tsx` | Tekrar edilecek kelime yoksa "+5 yeni kelime" (en sık kullanılanlardan); UZ→EN soruları |
| `screens/WordDetailScreen.tsx` | Örnek cümleler bölümü |
| `components/TranslationResult.tsx` | Örnek cümle, "Machine translation" etiketi |
| `utils/answerUtils.ts` | **Hata düzeltmesi:** `toLocaleLowerCase('tr-TR')` "I" harfini "ı" yapıyordu. Artık oʻ/o' farkı da sorun değil, "read" = "to read" |
| `types/word.ts` | `lang`, `examples`, `source` alanları (opsiyonel, eski kayıtlar bozulmaz) |
| `services/storage/wordStorage.ts` | Anahtar `word.id` (Özbekçe "son" ile İngilizce "son" çakışmasın), toplu kayıt |
| `backend/src/services/wordService.ts` | **Hata düzeltmesi:** dictionaryapi bulamazsa (ör. "look after") Tilmoch çevirisi bulsa bile 404 dönüyordu. `from=uz` desteği |
| `backend/src/services/translationService.ts` | Her iki yön + bellek içi önbellek (aynı kelime için API tekrar çağrılmaz) |
| `scripts/data-pipeline/` | **Yeni.** vocab.db üreten Python betiği |

**AppNavigator, diğer ekranlar, tema, istatistik ve tekrar servisi değiştirilmedi.** Kullanıcının daha önce kaydettiği kelimeler aynen çalışır.

## Kurulum

### 1. Bağımlılık
```bash
npm install          # package.json'a @op-engineering/op-sqlite eklendi
cd ios && pod install && cd ..
```

### 2. Sözlüğü üretin (bilgisayarınızda, bir kez)
```bash
cd scripts/data-pipeline
pip install -r requirements.txt
python build_vocab_db.py
```
- İlk çalıştırmada ~2.9 GB indirir (`.cache/` içine, tekrar indirmez), 10–30 dk sürer.
- Çıktı: `assets/db/vocab.db`
- Son satırda **sürüm numarası** yazar, ör. `sürüm 2026100214`.
- Test: `python -m pytest tests -q`

### 3. vocab.db'yi uygulamaya koyun
- **Android:** `android/app/src/main/assets/custom/vocab.db` (klasör adı `custom` olmalı)
- **iOS:** Xcode → dosyayı projeye sürükleyin → "Copy items if needed" + target işaretli → *Build Phases → Copy Bundle Resources* içinde olduğunu kontrol edin.

### 4. Sürümü yazın
`src/services/database/vocabDb.ts`:
```ts
export const VOCAB_DB_VERSION = 2026100214; // 2. adımdaki sayı
```
Sözlüğü her yeniden ürettiğinizde bu sayıyı güncelleyin.

### 5. Backend
Değişiklik gerekmez, eskisi gibi `cd backend && npm run dev`. Backend kapalıyken de sözlükteki kelimeler çalışır.

### 6. Lisans atfı (zorunlu)
Bir "About" ekranına ekleyin:
> Dictionary data: Wiktionary (CC BY-SA 4.0, via kaikki.org) and Tatoeba (CC BY 2.0 FR).

## Bilinmesi gerekenler
- Wiktionary'de İngilizce–Özbekçe birkaç bin eşleşme var. Sık kelimeler için yeterli olmalı, bulunmayanlar Tilmoch'a gider ve "Machine translation" etiketi alır.
- `normalize.ts` ile `scripts/data-pipeline/uz_text.py` aynı mantıkta olmalı. Birini değiştirirseniz diğerini de değiştirin.
- Gerçek cihazda backend için `wordService.ts` içindeki `API_URL`'ye bilgisayarınızın yerel IP'sini yazın.
