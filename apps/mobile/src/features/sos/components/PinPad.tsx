import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ScalePressable, Text } from '@/components/ui';
import { PIN_LENGTH } from '@/lib/pin';
import { colors, radius, spacing } from '@/theme';

type PinPadProps = {
  /** Called when the user taps the check key (or reaches the max length). */
  onSubmit: (pin: string) => void;
  /** Increment to play the "wrong PIN" shake and clear the entry. */
  errorSignal?: number;
  busy?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'] as const;

export function PinPad({ onSubmit, errorSignal = 0, busy = false }: PinPadProps) {
  const [pin, setPin] = useState('');
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  useEffect(() => {
    if (!errorSignal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- parent signals a wrong PIN; clear the entry once per signal
    setPin('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (!reduceMotion) {
      shake.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    }
  }, [errorSignal, reduceMotion, shake]);

  const press = (key: (typeof KEYS)[number]) => {
    if (busy) return;
    if (key === 'back') return setPin((p) => p.slice(0, -1));
    if (key === 'ok') {
      if (pin.length >= PIN_LENGTH.min) onSubmit(pin);
      return;
    }
    const next = (pin + key).slice(0, PIN_LENGTH.max);
    setPin(next);
    if (next.length === PIN_LENGTH.max) onSubmit(next);
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.dots, dotsStyle]} accessibilityLabel={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(PIN_LENGTH.min, pin.length) }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <View style={styles.grid}>
        {KEYS.map((key) => (
          <ScalePressable
            key={key}
            haptic={key === 'ok' ? 'medium' : 'light'}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? 'Delete' : key === 'ok' ? 'Confirm PIN' : key}
            onPress={() => press(key)}
            style={[styles.key, key === 'ok' && styles.okKey]}>
            {key === 'back' ? (
              <Delete size={24} color={colors.ink} strokeWidth={1.8} />
            ) : (
              <Text variant="title" color={key === 'ok' ? 'white' : 'ink'} style={key === 'ok' && styles.okText}>
                {key === 'ok' ? 'OK' : key}
              </Text>
            )}
          </ScalePressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.xxl },
  dots: { flexDirection: 'row', gap: spacing.md, height: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink3 },
  dotFilled: { backgroundColor: colors.ink, borderColor: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 + 2 * spacing.lg, gap: spacing.lg },
  key: {
    width: 76,
    height: 64,
    borderRadius: radius.button,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okKey: { backgroundColor: colors.ink },
  okText: { fontSize: 18 },
});
