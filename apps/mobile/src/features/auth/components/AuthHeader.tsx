import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors, fadeInUp, spacing } from '@/theme';

/** The SafeSphere mark: an ink sphere with a green horizon — same as the dashboard logo. */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" accessibilityLabel="SafeSphere">
      <Circle cx={15} cy={15} r={14} fill={colors.ink} />
      <Path d="M7 17c3 4 13 4 16 0" fill="none" stroke="#3DD39A" strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={15} cy={11} r={3} fill={colors.white} />
    </Svg>
  );
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Animated.View entering={fadeInUp()} style={styles.wrap}>
      <BrandMark />
      <View style={styles.text}>
        <Text variant="largeTitle">{title}</Text>
        <Text variant="body" color="ink2">
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl, marginTop: spacing.xxl, marginBottom: spacing.sm },
  text: { gap: spacing.xs },
});
