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

const TIMEOUT_MS = 10000;

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone',
    message: 'The microphone is used to check your pronunciation.',
    buttonPositive: 'OK',
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

export default function useSpeechRecognition() {
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
      addEventListener(EV.ERROR, (e: any) => {
        setError(String(e?.message ?? 'Speech recognition error'));
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
      if (!(await ensureMicPermission())) {
        setError('Microphone permission denied');
        return [];
      }
      if (!(await isRecognitionAvailable().catch(() => false))) {
        setError('Speech recognition is not available on this device');
        return [];
      }
      // Dil verilmezse telefonun dili kullanılır; İngilizce'yi zorla
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
    [finish],
  );

  const stop = useCallback(() => {
    stopListening().catch(() => undefined);
  }, []);

  return { listen, stop, listening, partial, error };
}