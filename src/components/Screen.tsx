import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
}

// Headers come from the navigator, so no top safe-area inset is needed here.
export function Screen({ children, scroll = true }: ScreenProps) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <View style={[styles.fill, styles.content, { backgroundColor: colors.background }]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
