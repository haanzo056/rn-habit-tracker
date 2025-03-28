export type DayKey = string;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Schedule = { type: 'daily' } | { type: 'weekly'; days: Weekday[] };

export interface SyncMeta {
  updatedAt: string;
  deletedAt: string | null;
}

export interface Habit extends SyncMeta {
  id: string;
  name: string;
  color: string;
  schedule: Schedule;
  reminderTime: string | null;
  archived: boolean;
  createdAt: string;
}

export interface Checkin extends SyncMeta {
  id: string;
  habitId: string;
  day: DayKey;
  createdAt: string;
}

export type EntityName = 'habit' | 'checkin';

export type HabitInput = Pick<Habit, 'name' | 'color' | 'schedule' | 'reminderTime'>;
