import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/colors';
import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="heading">{title}</Text>
      {message ? (
        <Text muted style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl * 2, gap: spacing.sm },
  message: { textAlign: 'center', maxWidth: 280 },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
