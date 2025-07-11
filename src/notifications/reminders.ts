import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import i18n from '@/i18n';
import { parseTime } from '@/lib/dates';
import type { Habit } from '@/types/habit';

const CHANNEL_ID = 'reminders';
const storageKey = (habitId: string) => `reminders:${habitId}`;

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18n.t('reminder.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelReminder(habitId: string): Promise<void> {
  const raw = await Storage.getItem(storageKey(habitId));
  if (!raw) return;
  const ids = JSON.parse(raw) as string[];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await Storage.removeItem(storageKey(habitId));
}

// Scheduled ids live in kv-store rather than the habits table: they're device-local
// and must never be synced.
//
// TODO: the reminder still fires on days the habit is already checked in. Fixing it
// means scheduling one-off DATE triggers for the next ~2 weeks and rescheduling on
// check-in and app start, instead of repeating triggers.
export async function scheduleReminder(habit: Habit): Promise<void> {
  await cancelReminder(habit.id);
  const time = habit.reminderTime ? parseTime(habit.reminderTime) : null;
  if (!time) return;
  if (!(await ensurePermission())) return;

  const content: Notifications.NotificationContentInput = {
    title: habit.name,
    body: i18n.t('reminder.body'),
    data: { habitId: habit.id },
  };

  const ids: string[] = [];
  if (habit.schedule.type === 'daily') {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: CHANNEL_ID,
        },
      }),
    );
  } else {
    for (const day of habit.schedule.days) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            // expo counts weekdays from 1 = Sunday
            weekday: day + 1,
            hour: time.hour,
            minute: time.minute,
            channelId: CHANNEL_ID,
          },
        }),
      );
    }
  }

  await Storage.setItem(storageKey(habit.id), JSON.stringify(ids));
}
