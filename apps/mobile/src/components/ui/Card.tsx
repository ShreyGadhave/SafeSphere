import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';

import { colors, radius, shadows, spacing } from '@/theme';

type CardProps = AnimatedProps<ViewProps> & {
  children: ReactNode;
  /** Remove inner padding, e.g. for grouped lists that pad their own rows. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, flush = false, style, ...rest }: CardProps) {
  return (
    <Animated.View {...rest} style={[styles.card, !flush && styles.padded, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  padded: { padding: spacing.lg },
});
