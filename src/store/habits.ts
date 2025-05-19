import { create } from 'zustand';
import { checkinId, getCheckin, listCheckins, saveCheckin } from '@/db/checkins';
import { getDb } from '@/db/client';
import { listHabits, saveHabit } from '@/db/habits';
import { createId } from '@/lib/id';
import { cancelReminder, scheduleReminder } from '@/notifications/reminders';
import type { Checkin, DayKey, Habit, HabitInput } from '@/types/habit';

type CompletedMap = Record<string, DayKey[]>;

interface HabitsState {
  ready: boolean;
  habits: Habit[];
  completed: CompletedMap;
  // Bumped after every local write that reached the outbox; the sync hook watches it.
  lastLocalChange: number;
  load(): Promise<void>;
  createHabit(input: HabitInput): Promise<Habit>;
  updateHabit(id: string, patch: Partial<HabitInput>): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  toggleCheckin(habitId: string, day: DayKey): Promise<void>;
}

function groupCheckins(checkins: Checkin[]): CompletedMap {
  const map: CompletedMap = {};
  for (const c of checkins) {
    (map[c.habitId] ??= []).push(c.day);
  }
  return map;
}

function syncReminder(habit: Habit) {
  const job =
    habit.reminderTime && !habit.archived && !habit.deletedAt
      ? scheduleReminder(habit)
      : cancelReminder(habit.id);
  job.catch((err) => console.warn('reminder update failed', err));
}

export const useHabits = create<HabitsState>()((set, get) => {
  async function persistHabit(habit: Habit) {
    await saveHabit(await getDb(), habit);
    set({ lastLocalChange: Date.now() });
    syncReminder(habit);
  }

  function replaceHabit(habit: Habit) {
    set((state) => ({
      habits: habit.deletedAt
        ? state.habits.filter((h) => h.id !== habit.id)
        : state.habits.map((h) => (h.id === habit.id ? habit : h)),
    }));
  }

  async function patchHabit(id: string, patch: Partial<Habit>) {
    const current = get().habits.find((h) => h.id === id);
    if (!current) return;
    const next: Habit = { ...current, ...patch, updatedAt: new Date().toISOString() };
    replaceHabit(next);
    await persistHabit(next);
  }

  return {
    ready: false,
    habits: [],
    completed: {},
    lastLocalChange: 0,

    async load() {
      try {
        const db = await getDb();
        const [habits, checkins] = await Promise.all([listHabits(db), listCheckins(db)]);
        set({ habits, completed: groupCheckins(checkins), ready: true });
      } catch (err) {
        console.error('failed to load habits', err);
        set({ ready: true });
      }
    },

    async createHabit(input) {
      const now = new Date().toISOString();
      const habit: Habit = {
        id: createId(),
        ...input,
        name: input.name.trim(),
        archived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      set((state) => ({ habits: [...state.habits, habit] }));
      await persistHabit(habit);
      return habit;
    },

    updateHabit: (id, patch) =>
      patchHabit(id, patch.name === undefined ? patch : { ...patch, name: patch.name.trim() }),

    setArchived: (id, archived) => patchHabit(id, { archived }),

    deleteHabit: (id) => patchHabit(id, { deletedAt: new Date().toISOString() }),

    async toggleCheckin(habitId, day) {
      const days = get().completed[habitId] ?? [];
      const wasDone = days.includes(day);
      set((state) => ({
        completed: {
          ...state.completed,
          [habitId]: wasDone ? days.filter((d) => d !== day) : [...days, day].sort(),
        },
      }));

      try {
        const db = await getDb();
        const id = checkinId(habitId, day);
        const existing = await getCheckin(db, id);
        const now = new Date().toISOString();
        await saveCheckin(db, {
          id,
          habitId,
          day,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          deletedAt: wasDone ? now : null,
        });
        set({ lastLocalChange: Date.now() });
      } catch (err) {
        console.error('failed to save check-in', err);
        await get().load();
      }
    },
  };
});
