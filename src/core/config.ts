/**
 * Uygulama serisinin ortak ayarları.
 *
 * `src/core/` klasörü serideki tüm uygulamalarda (Vocabulary, Grammar, Listening,
 * Reading, Writing) AYNI olacak şekilde yazıldı. İleride ortak bir pakete
 * (monorepo: packages/core) taşınacak; bu yüzden buradaki kod kelime
 * uygulamasına özel türler (Word vb.) import ETMEZ.
 *
 * Her uygulama yalnızca APP bloğunu kendine göre değiştirir.
 */

import { Platform } from 'react-native';

/** Seri adı — marka belli olunca burayı değiştirin (geçici isim). */
export const SUITE = {
  name: 'LinguaUz',
  /** Gizlilik politikasının yayınlanacağı adres (GitHub Pages vb.) */
  privacyUrl: 'https://example.com/linguauz/privacy',
  /** Destek / iletişim adresi (gizlilik politikasında da geçer) */
  contactEmail: 'support@example.com',
};

/**
 * Backend adresi.
 * - Geliştirme (__DEV__): Android emülatörü bilgisayara 10.0.2.2 ile, iOS simülatörü localhost ile ulaşır.
 *   Gerçek cihazda test ederken bilgisayarınızın yerel IP'sini yazın (örn. http://192.168.1.20:3000).
 * - Yayın (release): sunucunuzun HTTPS adresi. Android, release sürümde şifresiz http'ye izin vermez.
 */
const DEV_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const PROD_API_URL = 'https://api.example.com';
export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

/** Bu uygulama. */
export const APP = {
  /** Kalıcı kısa anahtar: veritabanında `app` sütununa yazılır, DEĞİŞTİRMEYİN. */
  key: 'vocabulary' as AppKey,
  name: 'LinguaUz Vocabulary',
  /** android/app/build.gradle içindeki versionName ile aynı tutun */
  version: '1.0.0',
};

/** Serideki uygulamalar. Yeni uygulama eklenince buraya eklenir. */
export type AppKey = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing';

/**
 * Ortak tekrar sistemindeki öğe türleri. Her uygulama kendi türünü kullanır,
 * hepsi aynı srs_cards tablosunda durur (ileride senkronla birleşir).
 */
export type ItemType = 'word' | 'grammar' | 'listening' | 'reading' | 'writing';
