import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui';
import { colors, shadows } from '@/theme';

import { SOS_TIMING } from '../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FRAME = 280;
const BUTTON = 200;
const RING = 236;
const RING_STROKE = 6;
const R = (RING - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function PulseRing({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.bezier(0.2, 0.6, 0.3, 1) }), -1)));
    return () => cancelAnimation(t);
  }, [t, delay, reduceMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - t.get()),
    transform: [{ scale: 0.78 + 0.4 * t.get() }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, style]} />;
}

type HoldToSosButtonProps = {
  onComplete: () => void;
  disabled?: boolean;
};

/**
 * B1: press and hold for 3 s. The ring fills while held; letting go early resets it.
 * Ticks a light haptic each second and a heavy one on completion.
 */
export function HoldToSosButton({ onComplete, disabled = false }: HoldToSosButtonProps) {
  const progress = useSharedValue(0);
  const ticks = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicks = () => {
    if (ticks.current) clearInterval(ticks.current);
    ticks.current = null;
  };

  useEffect(() => stopTicks, []);

  const finish = () => {
    stopTicks();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    progress.set(0);
    onComplete();
  };

  const onPressIn = () => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopTicks();
    ticks.current = setInterval(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 1000);
    progress.set(
      withTiming(1, { duration: SOS_TIMING.holdMs, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(finish);
      }),
    );
  };

  const onPressOut = () => {
    stopTicks();
    cancelAnimation(progress);
    progress.set(withTiming(0, { duration: 250 }));
  };

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.get()) }));
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * progress.get() }] }));

  return (
    <View style={styles.frame}>
      <PulseRing delay={0} />
      <PulseRing delay={1300} />
      <Svg width={RING} height={RING} style={styles.ring} pointerEvents="none">
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.white} strokeWidth={RING_STROKE} fill="none" />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke={colors.ink}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          animatedProps={ringProps}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="SOS. Press and hold for 3 seconds"
        accessibilityHint="Alerts your emergency contacts after a 5 second countdown"
        accessibilityActions={[{ name: 'activate', label: 'Send SOS' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onComplete()}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}>
        <Animated.View style={[styles.button, buttonStyle]}>
          <Text style={styles.sos}>SOS</Text>
          <Text variant="subhead" color="white" style={styles.hint}>
            Hold 3 s
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: FRAME,
    height: FRAME,
    borderRadius: FRAME / 2,
    backgroundColor: '#F7C9CC',
  },
  ring: { position: 'absolute' },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.sos,
  },
  sos: { fontFamily: 'Figtree_800ExtraBold', fontSize: 48, lineHeight: 52, letterSpacing: 2, color: colors.white },
  hint: { opacity: 0.9 },
});
