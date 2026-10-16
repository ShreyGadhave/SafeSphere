import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, spacing } from '@/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

type PinPadProps = {
  value: string;
  onChange: (next: string) => void;
  /** Number of dots shown (the PIN length expected). */
  length?: number;
  /** Change this (e.g. a counter) to play the "wrong" shake. */
  errorKey?: number;
  disabled?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** Numeric keypad with PIN dots. Digits never appear on screen — only filled dots. */
export function PinPad({ value, onChange, length = 4, errorKey = 0, disabled = false }: PinPadProps) {
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  useEffect(() => {
    if (errorKey === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (reduceMotion) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [errorKey, reduceMotion, shake]);

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'del') onChange(value.slice(0, -1));
    else if (value.length < length) onChange(value + key);
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.dots, dotsStyle]}
        accessibilityLabel={`${value.length} of ${length} digits entered`}
        accessibilityLiveRegion="polite">
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <View style={styles.grid}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={`blank-${i}`} style={styles.key} />
          ) : (
            <ScalePressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete digit' : key}
              haptic="light"
              disabled={disabled}
              onPress={() => press(key)}
              style={[styles.key, key !== 'del' && styles.keyFilled]}>
              {key === 'del' ? (
                <Delete size={24} color={colors.ink} strokeWidth={1.8} />
              ) : (
                <Text style={styles.digit}>{key}</Text>
              )}
            </ScalePressable>
          ),
        )}
      </View>
    </View>
  );
}

const KEY = 72;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xxxl },
  dots: { flexDirection: 'row', gap: spacing.lg, height: 16, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink },
  dotFilled: { backgroundColor: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: KEY * 3 + spacing.xl * 2, gap: spacing.md, columnGap: spacing.xl },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, alignItems: 'center', justifyContent: 'center' },
  keyFilled: { backgroundColor: colors.card },
  digit: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, color: colors.ink },
});
