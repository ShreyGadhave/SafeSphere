import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { Text } from './Text';

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Shown under the field in red; also marks the field invalid for screen readers. */
  error?: string | null;
  /** Quiet helper text under the field when there's no error. */
  hint?: string;
  ref?: Ref<TextInput>;
};

/** Labelled single-line input: white field on the grey ground, ink border when focused. */
export function TextField({ label, error, hint, ref, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text variant="footnote" color="ink2" style={styles.label}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        {...rest}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.iconMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, !!error && styles.invalid]}
      />
      {error ? (
        <Text variant="footnote" color="dangerText" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" color="ink3">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
  input: {
    minHeight: 52,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  focused: { borderColor: colors.ink },
  invalid: { borderColor: colors.danger },
});
