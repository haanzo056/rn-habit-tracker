import { getCalendars } from 'expo-localization';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toDayKey } from '@/lib/dates';
import type { DayKey } from '@/types/habit';

interface Today {
  today: DayKey;
  timeZone: string;
}

export function currentTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

function compute(): Today {
  const timeZone = currentTimeZone();
  return { today: toDayKey(new Date(), timeZone), timeZone };
}

export function useToday(): Today {
  const [state, setState] = useState(compute);

  useEffect(() => {
    const refresh = () =>
      setState((prev) => {
        const next = compute();
        return next.today === prev.today && next.timeZone === prev.timeZone ? prev : next;
      });

    // Polling once a minute is simpler than computing the next local midnight, which
    // gets messy around DST and when the user changes timezone mid-day.
    const interval = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return state;
}
