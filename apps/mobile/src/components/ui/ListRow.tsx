import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-side accessory, e.g. a Toggle or a value label. Defaults to a chevron when onPress is set. */
  accessory?: ReactNode;
  onPress?: () => void;
  /** Draw the divider under this row (off for the last row of a group). */
  divider?: boolean;
};

export function ListRow({ title, subtitle, icon: Icon, accessory, onPress, divider = true }: ListRowProps) {
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      {Icon ? (
        <View style={styles.iconWell}>
          <Icon size={19} color={colors.ink} strokeWidth={1.8} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="subhead">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" color="ink3">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ?? (onPress ? <ChevronRight size={20} color={colors.iconMuted} /> : null)}
    </View>
  );

  if (!onPress) return body;
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {body}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.divider },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
});
