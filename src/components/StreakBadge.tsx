import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface StreakBadgeProps {
  count: number;
  active: boolean;
}

export function StreakBadge({ count, active }: StreakBadgeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const previous = useRef(count);

  useEffect(() => {
    // Only celebrate growth; unchecking shouldn't bounce.
    if (count > previous.current) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 120 }),
        withSpring(1, { damping: 6, stiffness: 220 }),
      );
    }
    previous.current = count;
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: colors.surfaceAlt }, animatedStyle]}
      accessibilityLabel={`${t('streak.current')}: ${t('streak.days', { count })}`}
    >
      <Text variant="caption" color={active ? colors.text : colors.textMuted} style={styles.text}>
        {t('streak.days', { count })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
