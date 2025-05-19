import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { isScheduled, computeStreak } from '@/lib/streaks';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { DayKey, Habit } from '@/types/habit';
import { CheckButton } from './CheckButton';
import { StreakBadge } from './StreakBadge';
import { Text } from './Text';
import { WeekStrip } from './WeekStrip';

interface HabitRowProps {
  habit: Habit;
  completedDays: DayKey[];
  today: DayKey;
  onToggle: (habitId: string) => void;
  onPress: (habitId: string) => void;
}

function HabitRowBase({ habit, completedDays, today, onToggle, onPress }: HabitRowProps) {
  const { colors } = useTheme();
  const completed = useMemo(() => new Set(completedDays), [completedDays]);
  const streak = useMemo(
    () => computeStreak(habit.schedule, completedDays, today),
    [habit.schedule, completedDays, today],
  );
  const dueToday = isScheduled(habit.schedule, today);

  return (
    <Pressable
      onPress={() => onPress(habit.id)}
      accessibilityRole="button"
      accessibilityHint={habit.name}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, opacity: pressed ? 0.85 : dueToday ? 1 : 0.6 },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: habit.color }]} />
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={1}>
          {habit.name}
        </Text>
        <View style={styles.meta}>
          <StreakBadge count={streak.current} active={streak.completedToday} />
          <WeekStrip
            schedule={habit.schedule}
            completed={completed}
            today={today}
            color={habit.color}
          />
        </View>
      </View>
      <CheckButton
        checked={streak.completedToday}
        color={habit.color}
        label={habit.name}
        onToggle={() => onToggle(habit.id)}
      />
    </Pressable>
  );
}

export const HabitRow = memo(HabitRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body: { flex: 1, gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
