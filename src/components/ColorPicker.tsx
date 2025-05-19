import { Pressable, StyleSheet, View } from 'react-native';
import { habitColors, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {habitColors.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={color}
            onPress={() => onChange(color)}
            style={[styles.ring, { borderColor: selected ? colors.text : 'transparent' }]}
          >
            <View style={[styles.swatch, { backgroundColor: color }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ring: { padding: 3, borderRadius: 20, borderWidth: 2 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
