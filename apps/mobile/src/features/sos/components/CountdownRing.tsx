import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type CountdownRingProps = {
  size: number;
  stroke: number;
  color: string;
  track: string;
  /** Ring empties linearly over this many seconds. */
  durationS: number;
  children?: ReactNode;
};

/** A ring that depletes over `durationS` — used for the SOS countdown and the "Are you OK?" check. */
export function CountdownRing({ size, stroke, color, track, durationS, children }: CountdownRingProps) {
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(0);
    if (!reduceMotion) {
      offset.set(withTiming(circumference, { duration: durationS * 1000, easing: Easing.linear }));
    }
  }, [offset, circumference, durationS, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
