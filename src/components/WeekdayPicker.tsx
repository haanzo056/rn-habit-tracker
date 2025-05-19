import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Weekday } from '@/types/habit';
import { Text } from './Text';

// Monday first. Sunday-first calendars could follow expo-localization's
// firstWeekday, but nobody asked yet.
const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

interface WeekdayPickerProps {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const toggle = (day: Weekday) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.sort((a, b) => a - b));
  };

  return (
    <View style={styles.row}>
      {ORDER.map((day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => toggle(day)}
            style={[
              styles.day,
              {
                backgroundColor: selected ? colors.primary : colors.surfaceAlt,
              },
            ]}
          >
            <Text variant="caption" color={selected ? colors.onPrimary : colors.text}>
              {t(`weekdays.${day}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
