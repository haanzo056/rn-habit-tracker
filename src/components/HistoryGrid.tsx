import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { addDays, dayOfMonth, dayRange, weekdayOf } from '@/lib/dates';
import { isScheduled } from '@/lib/streaks';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { DayKey, Schedule } from '@/types/habit';
import { Text } from './Text';

const WEEKS = 6;

interface HistoryGridProps {
  schedule: Schedule;
  completed: ReadonlySet<DayKey>;
  today: DayKey;
  color: string;
  onToggleDay: (day: DayKey) => void;
}

export function HistoryGrid({ schedule, completed, today, color, onToggleDay }: HistoryGridProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Rows are Mon..Sun weeks ending with the current one.
  const offsetToMonday = (weekdayOf(today) + 6) % 7;
  const start = addDays(today, -offsetToMonday - (WEEKS - 1) * 7);
  const days = dayRange(start, addDays(start, WEEKS * 7 - 1));
  const weeks = Array.from({ length: WEEKS }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <Text key={d} variant="caption" muted style={styles.header}>
            {t(`weekdays.${d}`)}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.week}>
          {week.map((day) => {
            const future = day > today;
            const done = completed.has(day);
            const scheduled = isScheduled(schedule, day);
            return (
              <Pressable
                key={day}
                disabled={future}
                onPress={() => onToggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done, disabled: future }}
                accessibilityLabel={day}
                style={[
                  styles.cell,
                  {
                    backgroundColor: done ? color : scheduled ? colors.surfaceAlt : 'transparent',
                    borderColor: day === today ? colors.text : 'transparent',
                    opacity: future ? 0.3 : 1,
                  },
                ]}
              >
                <Text variant="caption" color={done ? '#FFFFFF' : colors.textMuted}>
                  {dayOfMonth(day)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  header: { width: 38, textAlign: 'center' },
  cell: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
