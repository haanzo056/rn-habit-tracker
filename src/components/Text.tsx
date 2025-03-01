import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';

interface TextProps extends RNTextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

export function Text({ variant = 'body', muted, color, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[styles[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  caption: { fontSize: 13 },
});
