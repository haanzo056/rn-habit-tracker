import { StyleSheet, View } from 'react-native';
import { lastNDays } from '@/lib/dates';
import { isScheduled } from '@/lib/streaks';
import { useTheme } from '@/theme/ThemeProvider';
import type { DayKey, Schedule } from '@/types/habit';

interface WeekStripProps {
  schedule: Schedule;
  completed: ReadonlySet<DayKey>;
  today: DayKey;
  color: string;
}

export function WeekStrip({ schedule, completed, today, color }: WeekStripProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants">
      {lastNDays(today, 7).map((day) => {
        const done = completed.has(day);
        const scheduled = isScheduled(schedule, day);
        return (
          <View
            key={day}
            style={[
              styles.dot,
              done
                ? { backgroundColor: color, borderColor: color }
                : { borderColor: scheduled ? colors.border : 'transparent' },
              !done && !scheduled && { backgroundColor: colors.surfaceAlt },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
});
