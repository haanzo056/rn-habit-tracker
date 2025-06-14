import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { currentTimeZone, useToday } from '@/hooks/useToday';
import { addDays, toDayKey } from '@/lib/dates';
import { completionRate, computeStreak, isScheduled } from '@/lib/streaks';
import { useHabits } from '@/store/habits';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const WINDOW = 30;

export default function StatsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { today } = useToday();
  const habits = useHabits((s) => s.habits);
  const completed = useHabits((s) => s.completed);

  const rows = useMemo(
    () =>
      habits
        .filter((h) => !h.archived)
        .map((habit) => {
          const days = completed[habit.id] ?? [];
          const streak = computeStreak(habit.schedule, days, today);
          // Don't penalise the rate for a today that's still in progress.
          const to = streak.completedToday ? today : addDays(today, -1);
          const createdDay = toDayKey(new Date(habit.createdAt), currentTimeZone());
          const windowStart = addDays(today, -(WINDOW - 1));
          const from = createdDay > windowStart ? createdDay : windowStart;
          return {
            habit,
            streak,
            dueToday: isScheduled(habit.schedule, today),
            rate: completionRate(habit.schedule, days, from, to),
          };
        }),
    [habits, completed, today],
  );

  if (rows.length === 0) {
    return (
      <Screen>
        <EmptyState title={t('stats.empty')} />
      </Screen>
    );
  }

  const due = rows.filter((r) => r.dueToday);
  const doneToday = due.filter((r) => r.streak.completedToday).length;
  const best = Math.max(...rows.map((r) => r.streak.longest));

  return (
    <Screen>
      <View style={styles.summary}>
        <Summary label={t('stats.doneToday')} value={`${doneToday}/${due.length}`} />
        <Summary label={t('stats.bestStreak')} value={String(best)} />
        <Summary label={t('stats.activeHabits')} value={String(rows.length)} />
      </View>

      {rows.map(({ habit, streak, rate }) => (
        <View key={habit.id} style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="heading" numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.numbers}>
            <Text variant="caption" muted>
              {t('streak.current')}: {t('streak.days', { count: streak.current })}
            </Text>
            <Text variant="caption" muted>
              {t('streak.longest')}: {t('streak.days', { count: streak.longest })}
            </Text>
          </View>
          <View style={styles.rateRow}>
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: habit.color, width: `${Math.round(rate * 100)}%` },
                ]}
              />
            </View>
            <Text variant="caption" style={styles.percent}>
              {Math.round(rate * 100)}%
            </Text>
          </View>
          <Text variant="caption" muted>
            {t('streak.rate')}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryItem, { backgroundColor: colors.surface }]}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" muted numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryItem: { flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: spacing.xs },
  card: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  numbers: { flexDirection: 'row', gap: spacing.lg },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flex: 1, height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  percent: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
