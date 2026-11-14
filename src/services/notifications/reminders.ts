/**
 * Günlük hatırlatma bildirimleri (notifee).
 * Uygulama her açıldığında / arka plana geçtiğinde yeniden planlanır:
 *  - bugünün hedefi tamamsa bugün bildirim gönderilmez
 *  - bildirim metni o anki "tekrar bekleyen kelime" sayısını içerir
 *  - uygulama birkaç gün açılmasa da hatırlatsın diye 3 güne kadar planlanır
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import type { TFunction } from '../../i18n/strings';

const CHANNEL_ID = 'daily-reminder';
const IDS = ['reminder-0', 'reminder-1', 'reminder-2'];
const DAYS_AHEAD = 3;

export type ReminderInput = {
  enabled: boolean;
  /** 'HH:MM' */
  time: string;
  dueCount: number;
  goalMetToday: boolean;
  streak: number;
  t: TFunction;
};

/** Planlanacak bildirim zamanları (saf fonksiyon, test edilebilir) */
export function reminderTimes(time: string, goalMetToday: boolean, now = new Date(), days = DAYS_AHEAD): Date[] {
  const [h, m] = time.split(':').map(Number);
  const out: Date[] = [];
  for (let i = 0; out.length < days && i <= days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (i === 0 && (goalMetToday || d.getTime() <= now.getTime() + 60_000)) {
      continue; // bugün hedef tamam ya da saat geçti
    }
    out.push(d);
  }
  return out;
}

export async function cancelReminders() {
  await notifee.cancelTriggerNotifications(IDS).catch(() => undefined);
}

/** İzin ister (Android 13+ / iOS). Verilmezse false. */
export async function ensurePermission(): Promise<boolean> {
  try {
    const s = await notifee.requestPermission();
    return s.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  } catch {
    return false;
  }
}

/**
 * Sadece kontrol eder, izin penceresi AÇMAZ. Arka planda planlama yaparken bu kullanılmalı:
 * requestPermission() her çağrıda sistem izin ekranını başlatır, bu da uygulamayı
 * arka plana atıp geri getirir (AppState background → active). Planlayıcı AppState'i
 * dinlediği için bu sonsuz döngüye girer: status bar yanıp söner, uygulama kapanır.
 */
export async function hasPermission(): Promise<boolean> {
  try {
    const s = await notifee.getNotificationSettings();
    return s.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  } catch {
    return false;
  }
}

const ASKED_KEY = '@reminders/permissionAsked';

/** İzni yalnızca ilk açılışta bir kez sorar; sonra Ayarlar'daki anahtar sorar. */
export async function askPermissionOnce(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) {
      return;
    }
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await ensurePermission();
  } catch {
    // izin sorulamazsa bildirimsiz devam
  }
}

export async function scheduleReminders(input: ReminderInput): Promise<void> {
  try {
    await cancelReminders();
    if (!input.enabled || !(await hasPermission())) {
      return;
    }
    const { t } = input;
    const channelId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: t('notif.channel'),
      importance: AndroidImportance.DEFAULT,
    });
    const times = reminderTimes(input.time, input.goalMetToday);
    for (let i = 0; i < times.length; i++) {
      // İlk bildirim güncel bilgiyle, sonrakiler genel metinle
      const body =
        i === 0 && input.dueCount > 0
          ? t('notif.bodyDue', { n: input.dueCount })
          : i === 0 && input.streak > 0
          ? t('notif.bodyStreak', { n: input.streak })
          : t('notif.bodyGeneric');
      await notifee.createTriggerNotification(
        {
          id: IDS[i],
          title: t('notif.title'),
          body,
          android: { channelId, pressAction: { id: 'default' } },
        },
        { type: TriggerType.TIMESTAMP, timestamp: times[i].getTime() },
      );
    }
  } catch (e) {
    console.warn('[reminders]', e);
  }
}
