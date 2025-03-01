import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: colors.surface }]}
          >
            <Text variant="caption" style={{ fontWeight: selected ? '600' : '400' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md - 2,
  },
});
