import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { HabitForm } from '@/components/HabitForm';
import { HistoryGrid } from '@/components/HistoryGrid';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToday } from '@/hooks/useToday';
import { computeStreak } from '@/lib/streaks';
import { useHabits } from '@/store/habits';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { today } = useToday();
  const habit = useHabits((s) => s.habits.find((h) => h.id === id));
  const days = useHabits((s) => s.completed[id]);
  const { toggleCheckin, updateHabit, setArchived, deleteHabit } = useHabits.getState();
  const [editing, setEditing] = useState(false);

  const completed = useMemo(() => new Set(days ?? []), [days]);
  const streak = useMemo(
    () => (habit ? computeStreak(habit.schedule, days ?? [], today) : null),
    [habit, days, today],
  );

  if (!habit || !streak) {
    return (
      <Screen>
        <EmptyState title={t('habit.notFound')} />
      </Screen>
    );
  }

  const confirmDelete = () => {
    Alert.alert(t('habit.deleteTitle'), t('habit.deleteMessage', { name: habit.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          router.back();
          void deleteHabit(habit.id);
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: editing ? t('habit.edit') : habit.name,
          headerRight: () => (
            <Button
              title={editing ? t('common.cancel') : t('habit.edit')}
              variant="ghost"
              onPress={() => setEditing((e) => !e)}
            />
          ),
        }}
      />

      {editing ? (
        <HabitForm
          initial={habit}
          submitLabel={t('common.save')}
          onSubmit={async (input) => {
            await updateHabit(habit.id, input);
            setEditing(false);
          }}
        />
      ) : (
        <>
          {habit.archived ? (
            <Text variant="label" muted>
              {t('habit.archived')}
            </Text>
          ) : null}

          <View style={styles.stats}>
            <Stat label={t('streak.current')} value={streak.current} color={habit.color} />
            <Stat label={t('streak.longest')} value={streak.longest} color={colors.text} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="heading">{t('habit.history')}</Text>
            <HistoryGrid
              schedule={habit.schedule}
              completed={completed}
              today={today}
              color={habit.color}
              onToggleDay={(day) => void toggleCheckin(habit.id, day)}
            />
            <Text variant="caption" muted>
              {t('habit.historyHint')}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title={habit.archived ? t('habit.unarchive') : t('habit.archive')}
              variant="secondary"
              onPress={() => void setArchived(habit.id, !habit.archived)}
            />
            <Button title={t('common.delete')} variant="danger" onPress={confirmDelete} />
          </View>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }]}>
      <Text variant="title" color={color}>
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.xs },
  card: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  actions: { gap: spacing.sm },
});
