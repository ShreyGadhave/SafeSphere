import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { colors, motion, settleEasing } from '@/theme';

type ProgressDotsProps = {
  total: number;
  /** Zero-based index of the current step. */
  current: number;
};

const transition = LinearTransition.duration(motion.duration.base)
  .easing(settleEasing)
  .reduceMotion(ReduceMotion.System);

/** Step indicator: done steps are ink, the current one is a wider pill, upcoming ones are grey. */
export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <Animated.View
          key={i}
          layout={transition}
          style={[styles.dot, i === current && styles.current, i <= current ? styles.done : styles.todo]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, width: 6, borderRadius: 3 },
  current: { width: 22 },
  done: { backgroundColor: colors.ink },
  todo: { backgroundColor: colors.fillStrong },
});
