import type { Schedule } from '@/types/habit';
import { addDays, toDayKey } from '../dates';
import { completionRate, computeStreak, isScheduled } from '../streaks';

const daily: Schedule = { type: 'daily' };
// Mon, Wed, Fri
const mwf: Schedule = { type: 'weekly', days: [1, 3, 5] };

function daysBack(today: string, ...offsets: number[]) {
  return offsets.map((n) => addDays(today, -n));
}

describe('isScheduled', () => {
  it('matches weekdays for weekly schedules', () => {
    expect(isScheduled(mwf, '2024-06-17')).toBe(true); // Mon
    expect(isScheduled(mwf, '2024-06-18')).toBe(false); // Tue
    expect(isScheduled(daily, '2024-06-18')).toBe(true);
  });
});

describe('computeStreak (daily)', () => {
  const today = '2024-06-20';

  it('is zero with no history', () => {
    expect(computeStreak(daily, [], today)).toEqual({
      current: 0,
      longest: 0,
      completedToday: false,
    });
  });

  it('counts consecutive days including today', () => {
    const result = computeStreak(daily, daysBack(today, 0, 1, 2), today);
    expect(result.current).toBe(3);
    expect(result.completedToday).toBe(true);
  });

  it('keeps the streak alive while today is still open', () => {
    const result = computeStreak(daily, daysBack(today, 1, 2, 3), today);
    expect(result.current).toBe(3);
    expect(result.completedToday).toBe(false);
  });

  it('resets after a missed day', () => {
    expect(computeStreak(daily, daysBack(today, 2, 3, 4), today).current).toBe(0);
    expect(computeStreak(daily, daysBack(today, 0, 2, 3), today).current).toBe(1);
  });

  it('tracks the longest run separately', () => {
    const history = [...daysBack(today, 10, 11, 12, 13, 14), ...daysBack(today, 0, 1)];
    expect(computeStreak(daily, history, today)).toMatchObject({ current: 2, longest: 5 });
  });

  it('ignores duplicate and future check-ins', () => {
    const history = [today, today, addDays(today, 1), addDays(today, -1)];
    expect(computeStreak(daily, history, today)).toMatchObject({ current: 2, longest: 2 });
  });
});

describe('computeStreak (weekly)', () => {
  // 2024-06-21 is a Friday
  const friday = '2024-06-21';

  it('skips unscheduled days without breaking', () => {
    const history = ['2024-06-14', '2024-06-17', '2024-06-19', friday];
    expect(computeStreak(mwf, history, friday).current).toBe(4);
  });

  it('breaks on a missed scheduled day', () => {
    // Wed 19th missed
    const history = ['2024-06-14', '2024-06-17', friday];
    expect(computeStreak(mwf, history, friday)).toMatchObject({ current: 1, longest: 2 });
  });

  it('counts extra days done off-schedule', () => {
    const history = ['2024-06-17', '2024-06-18', '2024-06-19'];
    expect(computeStreak(mwf, history, '2024-06-19').current).toBe(3);
  });

  it('does not break on an unscheduled today', () => {
    // Saturday, last check-in on Friday
    expect(computeStreak(mwf, ['2024-06-19', friday], '2024-06-22').current).toBe(2);
  });
});

describe('computeStreak around midnight', () => {
  // Regression: "today" used to be derived from the UTC date, so a user in Kyiv who
  // checked in at 00:30 local time saw it counted against yesterday.
  it('uses the local day for today', () => {
    const now = new Date('2024-06-20T21:30:00Z'); // 00:30 on the 21st in Kyiv
    const today = toDayKey(now, 'Europe/Kyiv');
    const history = ['2024-06-19', '2024-06-20', '2024-06-21'];
    expect(today).toBe('2024-06-21');
    expect(computeStreak(daily, history, today)).toMatchObject({
      current: 3,
      completedToday: true,
    });
  });

  it('check-in made just before midnight still belongs to that day', () => {
    const lateNight = new Date('2024-06-20T20:59:00Z'); // 23:59 in Kyiv
    const nextMorning = new Date('2024-06-21T06:00:00Z');
    const history = [toDayKey(lateNight, 'Europe/Kyiv')];
    const result = computeStreak(daily, history, toDayKey(nextMorning, 'Europe/Kyiv'));
    expect(result).toMatchObject({ current: 1, completedToday: false });
  });
});

describe('completionRate', () => {
  it('only counts scheduled days', () => {
    // Mon 17 .. Sun 23: three scheduled days, two done, plus one off-schedule
    const rate = completionRate(
      mwf,
      ['2024-06-17', '2024-06-18', '2024-06-21'],
      '2024-06-17',
      '2024-06-23',
    );
    expect(rate).toBeCloseTo(2 / 3);
  });

  it('is zero for an empty range', () => {
    expect(completionRate(daily, [], '2024-06-17', '2024-06-16')).toBe(0);
  });
});
