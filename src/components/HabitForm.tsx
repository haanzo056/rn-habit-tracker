import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { habitColors, spacing } from '@/theme/colors';
import type { HabitInput, Weekday } from '@/types/habit';
import { Button } from './Button';
import { ColorPicker } from './ColorPicker';
import { ReminderField } from './ReminderField';
import { Segmented } from './Segmented';
import { Text } from './Text';
import { TextField } from './TextField';
import { WeekdayPicker } from './WeekdayPicker';

interface HabitFormProps {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<void> | void;
}

const WORKDAYS: Weekday[] = [1, 2, 3, 4, 5];

export function HabitForm({ initial, submitLabel, onSubmit }: HabitFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<string>(initial?.color ?? habitColors[0]);
  const [scheduleType, setScheduleType] = useState(initial?.schedule.type ?? 'daily');
  const [days, setDays] = useState<Weekday[]>(
    initial?.schedule.type === 'weekly' ? initial.schedule.days : WORKDAYS,
  );
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime ?? null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = touched && !name.trim() ? t('habit.nameRequired') : null;
  const daysError = scheduleType === 'weekly' && days.length === 0 ? t('habit.pickDay') : null;

  const submit = async () => {
    setTouched(true);
    if (!name.trim() || daysError) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        color,
        schedule: scheduleType === 'daily' ? { type: 'daily' } : { type: 'weekly', days },
        reminderTime,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label={t('habit.name')}
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        placeholder={t('habit.namePlaceholder')}
        error={nameError}
        maxLength={60}
        returnKeyType="done"
        autoFocus={!initial}
      />

      <View style={styles.field}>
        <Text variant="label" muted>
          {t('habit.color')}
        </Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      <View style={styles.field}>
        <Text variant="label" muted>
          {t('habit.schedule')}
        </Text>
        <Segmented
          value={scheduleType}
          onChange={setScheduleType}
          options={[
            { value: 'daily', label: t('habit.daily') },
            { value: 'weekly', label: t('habit.weekly') },
          ]}
        />
        {scheduleType === 'weekly' ? <WeekdayPicker value={days} onChange={setDays} /> : null}
        {daysError ? (
          <Text variant="caption" muted>
            {daysError}
          </Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="label" muted>
          {t('habit.reminder')}
        </Text>
        <ReminderField value={reminderTime} onChange={setReminderTime} />
      </View>

      <Button title={submitLabel} onPress={submit} loading={saving} disabled={!!daysError} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  field: { gap: spacing.sm },
});
