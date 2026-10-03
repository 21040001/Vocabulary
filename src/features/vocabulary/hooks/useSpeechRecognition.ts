import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  addEventListener,
  destroy,
  isRecognitionAvailable,
  setRecognitionLanguage,
  speechRecogntionEvents as EV,
  startListening,
  stopListening,
} from 'react-native-speech-recognition-kit';
import { useT } from '../../../app/settings/SettingsContext';

const TIMEOUT_MS = 10000;

async function ensureMicPermission(title: string, message: string, ok: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS izni sistem kendisi sorar (Info.plist gerekli)
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title,
    message,
    buttonPositive: ok,
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Telefonun konuşma tanıma servisi.
 *   const { listen, stop, listening, partial, error } = useSpeechRecognition();
 *   const alternatives = await listen('en-US');   // ["apple", "apples", ...]
 */
export default function useSpeechRecognition() {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((alts: string[]) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((alts: string[]) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setListening(false);
    const r = resolver.current;
    resolver.current = null;
    r?.(alts);
  }, []);

  useEffect(() => {
    const subs = [
      addEventListener(EV.RESULTS, (e: any) => {
        const alts: string[] = (e?.results?.transcriptions ?? [])
          .map((t: any) => String(t?.text ?? ''))
          .filter(Boolean);
        if (!alts.length && e?.value) {
          alts.push(String(e.value));
        }
        finish(alts);
      }),
      addEventListener(EV.PARTIAL_RESULTS, (e: any) => setPartial(String(e?.value ?? ''))),
      addEventListener(EV.ERROR, () => {
        setError(tRef.current('pron.errGeneric'));
        finish([]);
      }),
    ];
    return () => {
      subs.forEach(sub => sub.remove());
      destroy().catch(() => undefined);
    };
  }, [finish]);

  const listen = useCallback(
    async (locale = 'en-US'): Promise<string[]> => {
      setError(null);
      setPartial('');
      if (!(await ensureMicPermission(t('pron.micTitle'), t('pron.micMessage'), t('common.ok')))) {
        setError(t('pron.errPermission'));
        return [];
      }
      if (!(await isRecognitionAvailable().catch(() => false))) {
        setError(t('pron.errUnavailable'));
        return [];
      }
      // Tanıma dili verilmezse telefonun dili kullanılır; İngilizce'yi zorla
      await setRecognitionLanguage(locale).catch(() => false);
      const p = new Promise<string[]>(res => {
        resolver.current = res;
      });
      timer.current = setTimeout(() => {
        stopListening().catch(() => undefined);
        finish([]);
      }, TIMEOUT_MS);
      setListening(true);
      try {
        await startListening();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        finish([]);
      }
      return p;
    },
    [finish, t],
  );

  const stop = useCallback(() => {
    stopListening().catch(() => undefined);
  }, []);

  return { listen, stop, listening, partial, error };
}
