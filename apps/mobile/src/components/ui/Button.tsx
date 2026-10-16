import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radius, spacing, type ColorName } from '@/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'tinted-danger';

const variantStyles: Record<ButtonVariant, { bg: ColorName; fg: ColorName }> = {
  primary: { bg: 'ink', fg: 'white' },
  danger: { bg: 'danger', fg: 'white' },
  secondary: { bg: 'fill', fg: 'ink' },
  'tinted-danger': { bg: 'dangerTint', fg: 'dangerText' },
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'regular' | 'large';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  /** Grow to fill the row. */
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon: Icon,
  loading = false,
  disabled = false,
  stretch = false,
  style,
}: ButtonProps) {
  const { bg, fg } = variantStyles[variant];
  const height = size === 'large' ? layout.buttonHeightLarge : layout.buttonHeight;

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      haptic={variant === 'danger' ? 'medium' : 'light'}
      onPress={onPress}
      style={[
        styles.base,
        { height, backgroundColor: colors[bg], opacity: disabled ? 0.5 : 1 },
        stretch && styles.stretch,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[fg]} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} color={colors[fg]} strokeWidth={1.8} /> : null}
          <Text variant="bodyStrong" color={fg}>
            {label}
          </Text>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretch: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
