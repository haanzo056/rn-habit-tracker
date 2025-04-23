import type { DayKey, Schedule } from '@/types/habit';
import { addDays, weekdayOf } from './dates';

export function isScheduled(schedule: Schedule, day: DayKey): boolean {
  if (schedule.type === 'daily') return true;
  return schedule.days.includes(weekdayOf(day));
}

export interface StreakResult {
  current: number;
  longest: number;
  completedToday: boolean;
}

export function computeStreak(
  schedule: Schedule,
  completedDays: Iterable<DayKey>,
  today: DayKey,
): StreakResult {
  const done = new Set(completedDays);
  // A check-in can be "in the future" after flying west, or when another device in a
  // later timezone synced it. It counts once that day arrives, not before.
  const past = [...done].filter((d) => d <= today).sort();
  const completedToday = done.has(today);
  const first = past[0];

  if (!first) return { current: 0, longest: 0, completedToday: false };

  // Today isn't a miss until it's over, so an unchecked today doesn't reset the streak.
  let current = 0;
  let cursor = completedToday ? today : addDays(today, -1);
  while (cursor >= first) {
    if (done.has(cursor)) current++;
    else if (isScheduled(schedule, cursor)) break;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (done.has(day)) {
      run++;
      longest = Math.max(longest, run);
    } else if (isScheduled(schedule, day) && day !== today) {
      run = 0;
    }
  }

  return { current, longest, completedToday };
}

export function completionRate(
  schedule: Schedule,
  completedDays: Iterable<DayKey>,
  from: DayKey,
  to: DayKey,
): number {
  const done = new Set(completedDays);
  let scheduled = 0;
  let hit = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (!isScheduled(schedule, day)) continue;
    scheduled++;
    if (done.has(day)) hit++;
  }
  return scheduled === 0 ? 0 : hit / scheduled;
}
