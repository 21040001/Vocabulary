import { useEffect } from 'react';
import { AppState } from 'react-native';
import { computeStreak, getActivity } from '../../services/storage/activity';
import { getAllStoredWords } from '../../services/storage/wordStorage';
import { scheduleReminders } from '../../services/notifications/reminders';
import { useSettings } from './SettingsContext';

/** Uygulama açılınca, arka plana geçince ve ayar değişince hatırlatmaları yeniden planlar */
export default function useReminderScheduler() {
  const { reminderEnabled, reminderTime, dailyGoal, t } = useSettings();

  useEffect(() => {
    const run = async () => {
      const [log, words] = await Promise.all([getActivity(), getAllStoredWords()]);
      const now = new Date();
      const streak = computeStreak(log, dailyGoal, now);
      const dueCount = words.filter(
        x => x.state.learningStatus !== 'mastered' && (!x.state.nextReviewAt || new Date(x.state.nextReviewAt) <= now),
      ).length;
      await scheduleReminders({
        enabled: reminderEnabled,
        time: reminderTime,
        dueCount,
        goalMetToday: streak.goalMet,
        streak: streak.current,
        t,
      });
    };
    run();
    const sub = AppState.addEventListener('change', st => {
      if (st === 'background' || st === 'active') {
        run();
      }
    });
    return () => sub.remove();
  }, [reminderEnabled, reminderTime, dailyGoal, t]);
}
