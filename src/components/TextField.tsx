import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
