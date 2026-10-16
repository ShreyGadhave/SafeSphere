import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, radius, shadows, spacing, type ColorName } from '@/theme';

type ActionTileProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tint: ColorName;
  iconColor: ColorName;
  index: number;
  onPress: () => void;
};

export function ActionTile({ title, subtitle, icon: Icon, tint, iconColor, index, onPress }: ActionTileProps) {
  return (
    <Animated.View entering={fadeInUp(index + 1)} style={styles.cell}>
      <ScalePressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.tile}>
        <View style={[styles.iconWell, { backgroundColor: colors[tint] }]}>
          <Icon size={22} color={colors[iconColor]} strokeWidth={1.8} />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color="ink3">
            {subtitle}
          </Text>
        </View>
      </ScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { width: '48.3%' },
  tile: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  iconWell: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { gap: spacing.xxs },
});
