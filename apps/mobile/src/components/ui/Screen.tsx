import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing, type ColorName } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (default) or a fixed full-height layout. */
  scroll?: boolean;
  background?: ColorName;
  /** Leave room for the floating tab bar on tab screens. */
  withTabBar?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll = true,
  background = 'ground',
  withTabBar = false,
  edges = ['top'],
  contentStyle,
}: ScreenProps) {
  const bottomPad = withTabBar ? layout.tabBarHeight + spacing.xxl : spacing.xxl;

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors[background] }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, { paddingBottom: bottomPad }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
});
