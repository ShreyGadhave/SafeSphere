import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Card, Text } from '@/components/ui';
import { colors, fadeInUp, motion, settleEasing, spacing } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 96;
const STROKE = 9;
const R = (SIZE - STROKE) / 2 - 3.5;
const CIRCUMFERENCE = 2 * Math.PI * R;

export type RiskLevel = 'low' | 'medium' | 'high';

const LEVEL_STYLE: Record<RiskLevel, { ring: string; track: string; label: string; text: keyof typeof colors }> = {
  low: { ring: colors.safe, track: colors.safeTint, label: 'Low risk right now', text: 'safeText' },
  medium: { ring: colors.warning, track: colors.warningTint, label: 'Medium risk right now', text: 'warningText' },
  high: { ring: colors.danger, track: colors.dangerTint, label: 'High risk right now', text: 'dangerText' },
};

type RiskRingCardProps = {
  score: number;
  level: RiskLevel;
  area: string;
  detail: string;
};

/** Hero card on Home: the current area's predicted risk (ML-1) as a ring that draws itself in. */
export function RiskRingCard({ score, level, area, detail }: RiskRingCardProps) {
  const reduceMotion = useReducedMotion();
  const style = LEVEL_STYLE[level];
  const target = CIRCUMFERENCE * (1 - Math.min(Math.max(score, 0), 100) / 100);

  const offset = useSharedValue(reduceMotion ? target : CIRCUMFERENCE);
  const dot = useSharedValue(1);

  useEffect(() => {
    offset.set(reduceMotion ? target : withTiming(target, { duration: motion.duration.gauge, easing: settleEasing }));
  }, [offset, target, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    dot.set(withRepeat(withSequence(withTiming(0.35, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1));
  }, [dot, reduceMotion]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.get() }));

  return (
    <Card entering={fadeInUp()} style={styles.card}>
      <View style={styles.ring} accessible accessibilityLabel={`Area risk ${score} out of 100`}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={style.track} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={style.ring}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={ringProps}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text variant="metric">{score}</Text>
          <Text variant="footnote" color="ink3" style={styles.ringCaption}>
            RISK
          </Text>
        </View>
      </View>

      <View style={styles.text}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.dot, { backgroundColor: style.ring }, dotStyle]} />
          <Text variant="caption" color={style.text} style={styles.status}>
            {style.label}
          </Text>
        </View>
        <Text variant="title" style={styles.area}>
          {area}
        </Text>
        <Text variant="caption" color="ink3">
          {detail}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg + 2, padding: spacing.lg + 2 },
  ring: { width: SIZE, height: SIZE },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringCaption: { fontSize: 11, fontFamily: 'Figtree_600SemiBold' },
  text: { flex: 1, gap: spacing.xs + 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontFamily: 'Figtree_600SemiBold' },
  area: { fontSize: 20, lineHeight: 24 },
});
