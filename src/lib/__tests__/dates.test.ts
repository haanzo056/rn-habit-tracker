import {
  addDays,
  dayRange,
  diffDays,
  isDayKey,
  lastNDays,
  parseTime,
  toDayKey,
  weekdayOf,
} from '../dates';

describe('toDayKey', () => {
  const instant = new Date('2024-03-10T23:30:00Z');

  it('uses the calendar date of the given timezone', () => {
    expect(toDayKey(instant, 'UTC')).toBe('2024-03-10');
    expect(toDayKey(instant, 'Europe/Kyiv')).toBe('2024-03-11');
    expect(toDayKey(instant, 'America/Los_Angeles')).toBe('2024-03-10');
  });

  it('handles half-hour offsets', () => {
    expect(toDayKey(new Date('2024-01-01T18:45:00Z'), 'Asia/Kolkata')).toBe('2024-01-02');
  });

  it('is not tricked by the local midnight edge', () => {
    // 00:00:30 in Kyiv is still the previous day in UTC
    expect(toDayKey(new Date('2024-06-14T21:00:30Z'), 'Europe/Kyiv')).toBe('2024-06-15');
    expect(toDayKey(new Date('2024-06-14T20:59:59Z'), 'Europe/Kyiv')).toBe('2024-06-14');
  });
});

describe('day arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('is unaffected by DST transitions', () => {
    expect(addDays('2024-03-30', 1)).toBe('2024-03-31');
    expect(addDays('2024-03-31', 1)).toBe('2024-04-01');
    expect(diffDays('2024-03-30', '2024-04-02')).toBe(3);
  });

  it('returns weekday with sunday as 0', () => {
    expect(weekdayOf('2024-06-16')).toBe(0);
    expect(weekdayOf('2024-06-17')).toBe(1);
  });

  it('builds inclusive ranges', () => {
    expect(dayRange('2024-02-27', '2024-03-01')).toEqual([
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
    expect(lastNDays('2024-01-02', 3)).toEqual(['2023-12-31', '2024-01-01', '2024-01-02']);
    expect(dayRange('2024-01-02', '2024-01-01')).toEqual([]);
  });

  it('validates keys', () => {
    expect(isDayKey('2024-01-01')).toBe(true);
    expect(isDayKey('2024-1-1')).toBe(false);
  });
});

describe('parseTime', () => {
  it('parses HH:MM', () => {
    expect(parseTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('7:05')).toEqual({ hour: 7, minute: 5 });
  });

  it('rejects garbage', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('noon')).toBeNull();
  });
});
