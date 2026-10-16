import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorName, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = 'ink', align, style, children, ...rest }: TextProps) {
  const content =
    variant === 'sectionLabel' && typeof children === 'string' ? children.toUpperCase() : children;

  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
      accessibilityRole={variant === 'largeTitle' || variant === 'title' ? 'header' : rest.accessibilityRole}>
      {content}
    </RNText>
  );
}
