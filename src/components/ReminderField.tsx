import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatTime, parseTime } from '@/lib/dates';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

const DEFAULT_TIME = '09:00';

interface ReminderFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

function toDate(value: string): Date {
  const time = parseTime(value) ?? { hour: 9, minute: 0 };
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

export function ReminderField({ value, onChange }: ReminderFieldProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();

  const handlePicked = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) return;
    onChange(formatTime(date.getHours(), date.getMinutes()));
  };

  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: toDate(value ?? DEFAULT_TIME),
      mode: 'time',
      is24Hour: true,
      onChange: handlePicked,
    });
  };

  return (
    <View style={styles.row}>
      <Switch
        value={value !== null}
        onValueChange={(on) => onChange(on ? DEFAULT_TIME : null)}
        trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
        accessibilityLabel={t('habit.reminder')}
      />
      {value === null ? (
        <Text muted>{t('reminder.off')}</Text>
      ) : Platform.OS === 'ios' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="compact"
          themeVariant={scheme}
          onChange={handlePicked}
        />
      ) : (
        <Pressable onPress={openAndroidPicker} accessibilityRole="button" hitSlop={8}>
          <Text variant="heading" color={colors.primary}>
            {value}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 },
});
