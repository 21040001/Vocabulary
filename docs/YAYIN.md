# Play Store'a yayın rehberi (Android)

Bu rehber Vocabulary uygulaması için yazıldı. Serideki diğer uygulamalarda (Grammar, Listening…) aynı adımlar geçerli; sadece paket adı ve uygulama adı değişir.

---

## 0. Bir kez karar verilecekler

| Ne | Nerede | Not |
|---|---|---|
| Marka / seri adı | `src/core/config.ts` → `SUITE.name`, `APP.name` | Şu an geçici: **LinguaUz** |
| Paket adı (applicationId) | `android/app/build.gradle` → `defaultConfig.applicationId` | **Play'e ilk yüklemeden sonra ASLA değişmez.** Öneri: `uz.<marka>.vocabulary`, `uz.<marka>.grammar`… |
| Gizlilik politikası adresi | `SUITE.privacyUrl` | Aşağıda 4. adım |
| İletişim e-postası | `SUITE.contactEmail` ve `docs/privacy-policy.html` | Play'de de istenir |
| Sunucu adresi (HTTPS) | `src/core/config.ts` → `PROD_API_URL` | Release sürüm şifresiz `http://` kullanamaz |

> `namespace "com.vocabulary"` ve Kotlin dosyalarının klasörü (`java/com/vocabulary`) **değişmeden kalabilir**. Play sadece `applicationId`'ye bakar.

---

## 1. Android 16 hedefi (zorunlu)

31 Ağustos 2026'dan beri Play, yeni uygulamaların ve güncellemelerin **API 36 (Android 16)** hedeflemesini istiyor. React Native 0.80 şablonu 35 ile geliyor.

`android/build.gradle`:
```gradle
buildToolsVersion = "36.0.0"
compileSdkVersion = 36
targetSdkVersion = 36
```
Android Studio → SDK Manager'dan **Android 16 (API 36)** platformunu ve **Build-Tools 36.0.0**'ı kurun.

Derlemede "compileSdk 36 desteklenmiyor" uyarısı çıkarsa `android/gradle.properties` sonuna ekleyin:
```properties
android.suppressUnsupportedCompileSdk=36
```

Android 16'da uygulama ekranın tamamına (durum çubuğu ve alt gezinme çubuğunun arkasına) çizilir. Başlıklı ve sekmeli ekranlarımız bunu kendisi hallediyor; yine de gerçek telefonda alt kısımları (kartlar, geri al çubuğu) kontrol edin.

> Uzun vadede en temiz yol React Native 0.81+'ya geçmek (API 36 orada varsayılan). Bunu ayrı bir adım olarak yaparız.

---

## 2. Açılış ekranı ve ikon

Dosyalar zip'te hazır (`res/mipmap-*`, `res/drawable-*/splash_icon.png`, `values/ic_launcher_background.xml`, `values/styles.xml`, `MainActivity.kt`). Ayrıca iki küçük değişiklik:

**`android/app/build.gradle`** → `dependencies { ... }` içine:
```gradle
implementation("androidx.core:core-splashscreen:1.0.1")
```

**`android/app/src/main/AndroidManifest.xml`** → `<application ...>` etiketinde:
```xml
android:theme="@style/AppTheme"
```
satırını şununla değiştirin:
```xml
android:theme="@style/Theme.App.Starting"
```

İkonu değiştirmek isterseniz: `python scripts/branding/make_icons.py` (renk/yazı betiğin başında) ya da Android Studio → *New → Image Asset*.

---

## 3. İmza anahtarı (keystore) — sadece bir kez

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore linguauz-upload.keystore -alias linguauz-upload -keyalg RSA -keysize 2048 -validity 10000
```
(Windows'ta `keytool`, Android Studio'nun JDK'sındadır: `"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"`.)

- Dosyayı `android/app/` içine koyun.
- **Dosyayı ve şifreyi kaybetmeyin**, bir yere yedekleyin (parola yöneticisi + bulut). Play App Signing açık olduğu için kaybederseniz Play Console'dan sıfırlatılabilir ama uğraştırır.
- `.gitignore`'a ekleyin: `*.keystore` (debug.keystore hariç tutmak isterseniz `!android/app/debug.keystore`).

Şifreleri projeye değil, **bilgisayarınızdaki** `~/.gradle/gradle.properties` dosyasına yazın (Windows: `C:\Users\<siz>\.gradle\gradle.properties`):
```properties
LINGUAUZ_UPLOAD_STORE_FILE=linguauz-upload.keystore
LINGUAUZ_UPLOAD_KEY_ALIAS=linguauz-upload
LINGUAUZ_UPLOAD_STORE_PASSWORD=*****
LINGUAUZ_UPLOAD_KEY_PASSWORD=*****
```
Serideki tüm uygulamalar aynı anahtarı kullanabilir.

**`android/app/build.gradle`** → `signingConfigs` ve `buildTypes` bloklarını şöyle yapın:
```gradle
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('LINGUAUZ_UPLOAD_STORE_FILE')) {
                storeFile file(LINGUAUZ_UPLOAD_STORE_FILE)
                storePassword LINGUAUZ_UPLOAD_STORE_PASSWORD
                keyAlias LINGUAUZ_UPLOAD_KEY_ALIAS
                keyPassword LINGUAUZ_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
```
Sürüm numarası (`defaultConfig`): her yüklemede `versionCode` 1 artar; `versionName`'i `src/core/config.ts` → `APP.version` ile aynı tutun.
```gradle
versionCode 1
versionName "1.0.0"
```

---

## 4. Gizlilik politikası

`docs/privacy-policy.html` hazır (Özbekçe + İngilizce). Köşeli parantezli yerleri doldurun (e-posta, log süresi) ve herkese açık bir adrese koyun. En kolayı GitHub Pages:

1. GitHub'da herkese açık bir depo açın (örn. `linguauz-legal`).
2. Dosyayı `privacy/index.html` adıyla yükleyin.
3. Settings → Pages → Branch: `main` / root → Save.
4. Adres: `https://<kullanıcı-adınız>.github.io/linguauz-legal/privacy/` → bunu `SUITE.privacyUrl`'e ve Play Console'a yazın.

Tüm seri tek bir politika sayfasını kullanabilir (sayfa zaten "LinguaUz ilovalari" diyor).

---

## 5. Yayın paketini (AAB) üretmek

```bash
cd android
./gradlew clean
./gradlew bundleRelease        # Windows: gradlew.bat bundleRelease
```
Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`

Yüklemeden önce telefonda release sürümü denemek için:
```bash
npx react-native run-android --mode release
```
Kontrol listesi: sözlük açılıyor mu (vocab.db), arama, sesli okuma, mikrofon izni, bildirim izni, yedek kaydet/yükle, karanlık mod, açılış ekranı, ikon.

---

## 6. Play Console

1. **Uygulama oluştur** → ad, varsayılan dil, "Uygulama / Ücretsiz".
2. **Önce Dahili test (Internal testing)** kanalına AAB yükleyin, kendinizi test kullanıcısı ekleyin. Sorun yoksa Kapalı test → Üretim.
   - 2023 sonrası açılan **kişisel** geliştirici hesaplarında üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** şartı var.
3. **Mağaza girişi:** `docs/store/play-icon-512.png` (ikon), `docs/store/feature-graphic-1024x500.png` (öne çıkan görsel), en az 2 telefon ekran görüntüsü, kısa ve uzun açıklama.
4. **Uygulama içeriği:**
   - Gizlilik politikası URL'si (4. adım)
   - Reklam: Hayır
   - Uygulama erişimi: Tüm özellikler giriş gerektirmeden kullanılabilir
   - İçerik derecelendirmesi anketi (Eğitim)
   - Hedef kitle: 13 yaş altını seçerseniz "Aileler" politikası devreye girer; ilk sürüm için **13+** seçmek daha sade
   - **Veri güvenliği** (öneri, kendi sunucu ayarlarınıza göre kontrol edin):
     - Veri toplanıyor mu: aranan kelime metni sunucuya gidiyor → "Uygulama etkinliği → Diğer kullanıcı içeriği", amaç "Uygulama işlevselliği", kullanıcıyla ilişkilendirilmiyor, aktarım şifreli (HTTPS)
     - Paylaşılıyor mu: çeviri servisine (Tilmoch) iletiliyor → hizmet sağlayıcı olarak sayılır
     - Mikrofon: konuşma tanıma telefonun sistem servisiyle yapılıyor, uygulama ses kaydetmiyor
     - Silme talebi: hesap olmadığı için cihazdaki veriler uygulama silinince gider
5. **Gönder** → inceleme genelde birkaç gün sürer.

---

## Seri için not

- Her uygulama Play'de ayrı bir giriş, ayrı `applicationId`, aynı imza anahtarı.
- `src/core/` klasörü tüm uygulamalarda aynı kalacak (ileride ortak paket). Yedek dosyası biçimi (`linguauz-backup`) ortak: bir uygulamada alınan yedek diğerine yüklenebilir.
- Hesap + senkron (Aşama 2) eklenince gizlilik politikası ve Veri güvenliği formu güncellenmeli.
