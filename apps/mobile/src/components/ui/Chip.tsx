import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Selectable pill (emergency type, filters). Selection is an ink outline, never color alone. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      haptic="light"
      style={[styles.chip, selected && styles.selected]}>
      <Text variant={selected ? 'bodyStrong' : 'subhead'} style={styles.label}>
        {label}
      </Text>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  selected: { borderColor: colors.ink },
  label: { fontSize: 14 },
});
