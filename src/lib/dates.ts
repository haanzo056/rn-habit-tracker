import type { DayKey, Weekday } from '@/types/habit';

const DAY_MS = 86_400_000;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function toDayKey(date: Date, timeZone: string): DayKey {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isDayKey(value: string): value is DayKey {
  return DAY_KEY_RE.test(value);
}

// Day keys are calendar dates, not instants, so all arithmetic happens in UTC where
// every day is exactly 24h long. Doing this in local time breaks across DST changes.
function toUtcDate(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function addDays(key: DayKey, amount: number): DayKey {
  const date = toUtcDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function diffDays(from: DayKey, to: DayKey): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_MS);
}

export function weekdayOf(key: DayKey): Weekday {
  return toUtcDate(key).getUTCDay() as Weekday;
}

export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const days: DayKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export function lastNDays(today: DayKey, n: number): DayKey[] {
  return dayRange(addDays(today, -(n - 1)), today);
}

export function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10));
}

export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
