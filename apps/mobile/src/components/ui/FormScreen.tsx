import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, type ColorName } from '@/theme';

type FormScreenProps = {
  children: ReactNode;
  /** Pinned under the scroll area and lifted above the keyboard — usually the primary button. */
  footer?: ReactNode;
  background?: ColorName;
  contentStyle?: ViewStyle;
};

/** Full-height screen for forms: scrolls, keeps taps working while the keyboard is open, sticky footer. */
export function FormScreen({ children, footer, background = 'ground', contentStyle }: FormScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: colors[background] }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
});
