import { Easing, FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { motion } from './tokens';

export const settleEasing = Easing.bezier(...motion.easing);

/**
 * Standard "rise into place" entrance used for cards and list items.
 * Pass an index to stagger siblings. Respects the OS reduce-motion setting.
 */
export function fadeInUp(index = 0) {
  return FadeInUp.duration(motion.duration.enter)
    .delay(index * motion.stagger)
    .easing(settleEasing)
    .reduceMotion(ReduceMotion.System);
}
