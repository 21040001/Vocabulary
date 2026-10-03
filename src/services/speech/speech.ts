import { Platform } from 'react-native';
import Speech from '@mhpdev/react-native-speech';
import Sound from 'react-native-sound';

import { Lang } from '../../features/vocabulary/types/word';

export type PronounceResult = 'audio' | 'tts' | 'no-voice';

const LOCALE: Record<Lang, string> = { en: 'en-US', uz: 'uz-UZ' };
const RATE = Platform.OS === 'ios' ? 0.42 : 0.85;

Sound.setCategory('Playback');

const voiceCache: Partial<Record<Lang, boolean>> = {};

export async function hasVoice(lang: Lang): Promise<boolean> {
  if (voiceCache[lang] === undefined) {
    try {
      const voices = await Speech.getAvailableVoices(lang);
      voiceCache[lang] = voices.length > 0;
    } catch {
      voiceCache[lang] = lang === 'en';
    }
  }
  return voiceCache[lang]!;
}

let current: Sound | null = null;

function playUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    current?.stop();
    current?.release();
    const s = new Sound(url, '', err => {
      if (err) {
        s.release();
        reject(err);
        return;
      }
      current = s;
      s.play(ok => {
        s.release();
        if (current === s) {
          current = null;
        }
        ok ? resolve() : reject(new Error('playback failed'));
      });
    });
  });
}

export async function speak(text: string, lang: Lang): Promise<boolean> {
  await Speech.stop().catch(() => undefined);
  if (!(await hasVoice(lang))) {
    return false;
  }
  await Speech.speak(text, { language: LOCALE[lang], rate: RATE, silentMode: 'ignore' });
  return true;
}

export async function pronounce(text: string, lang: Lang, audioUrl?: string): Promise<PronounceResult> {
  if (audioUrl) {
    try {
      await playUrl(audioUrl);
      return 'audio';
    } catch {
      // internet yok ya da kayıt bozuk -> telefonun sesi
    }
  }
  return (await speak(text, lang)) ? 'tts' : 'no-voice';
}

export const openVoiceInstaller = () => Speech.openVoiceDataInstaller().catch(() => undefined);