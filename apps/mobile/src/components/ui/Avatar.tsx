import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { Text } from './Text';

/** Soft, lightness-distinct fills so stacked avatars stay distinguishable. */
const FILLS = ['#FDE7D8', '#DCE7FB', '#E3F2E9', '#EFE6FB', '#FBEFD0'] as const;

type AvatarProps = {
  name: string;
  size?: number;
  /** Ring color when avatars overlap in a stack. */
  ringColor?: string;
  index?: number;
};

export function Avatar({ name, size = 30, ringColor = colors.ground, index = 0 }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: FILLS[index % FILLS.length],
          borderColor: ringColor,
        },
      ]}>
      <Text variant="footnote" style={{ fontSize: size * 0.38, fontFamily: 'Figtree_800ExtraBold' }}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
