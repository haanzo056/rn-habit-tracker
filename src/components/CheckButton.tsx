import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

interface CheckButtonProps {
  checked: boolean;
  color: string;
  onToggle: () => void;
  label: string;
  size?: number;
}

export function CheckButton({ checked, color, onToggle, label, size = 40 }: CheckButtonProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 180 });
  }, [checked, progress]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', color]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, color]),
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    );
    void Haptics.impactAsync(
      checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    onToggle();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={handlePress}
    >
      <Animated.View
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, circleStyle]}
      >
        <Animated.View style={iconStyle}>
          <Ionicons name="checkmark" size={size * 0.6} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
