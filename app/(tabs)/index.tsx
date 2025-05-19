import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { HabitRow } from '@/components/HabitRow';
import { Text } from '@/components/Text';
import { useToday } from '@/hooks/useToday';
import { isScheduled } from '@/lib/streaks';
import { useHabits } from '@/store/habits';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { DayKey } from '@/types/habit';

const NONE: DayKey[] = [];

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { today, timeZone } = useToday();
  const habits = useHabits((s) => s.habits);
  const completed = useHabits((s) => s.completed);
  const toggleCheckin = useHabits((s) => s.toggleCheckin);

  const { due, other } = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    return {
      due: active.filter((h) => isScheduled(h.schedule, today)),
      other: active.filter((h) => !isScheduled(h.schedule, today)),
    };
  }, [habits, today]);

  const doneCount = due.filter((h) => completed[h.id]?.includes(today)).length;

  const heading = useMemo(
    () =>
      new Date().toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone,
      }),
    // today is here so the heading rolls over at midnight
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language, timeZone, today],
  );

  const onToggle = useCallback(
    (habitId: string) => void toggleCheckin(habitId, today),
    [toggleCheckin, today],
  );
  const onPress = useCallback((habitId: string) => router.push(`/habit/${habitId}`), []);

  const data = other.length > 0 ? [...due, 'separator' as const, ...other] : due;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={data}
      keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
      ListHeaderComponent={
        due.length + other.length > 0 ? (
          <View style={styles.header}>
            <Text variant="title">{heading}</Text>
            {due.length > 0 ? (
              <Text muted>{t('today.progress', { done: doneCount, total: due.length })}</Text>
            ) : null}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          title={t('today.emptyTitle')}
          message={t('today.emptyMessage')}
          actionLabel={t('today.emptyAction')}
          onAction={() => router.push('/habit/new')}
        />
      }
      renderItem={({ item }) =>
        typeof item === 'string' ? (
          <Text variant="label" muted style={styles.separator}>
            {t('today.notToday')}
          </Text>
        ) : (
          <HabitRow
            habit={item}
            completedDays={completed[item.id] ?? NONE}
            today={today}
            onToggle={onToggle}
            onPress={onPress}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  separator: { marginTop: spacing.lg },
});
