import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const background = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const foreground = {
    primary: colors.onPrimary,
    secondary: colors.text,
    ghost: colors.primary,
    danger: colors.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={styles.label} color={foreground}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600' },
});
