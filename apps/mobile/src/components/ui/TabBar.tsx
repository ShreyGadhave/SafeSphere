import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { House, Map, User, Users, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, shadows, spacing } from '@/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

const TAB_META: Record<string, { label: string; icon?: LucideIcon }> = {
  index: { label: 'Home', icon: House },
  map: { label: 'Map', icon: Map },
  sos: { label: 'SOS' },
  community: { label: 'Community', icon: Users },
  profile: { label: 'Profile', icon: User },
};

/** Custom tab bar from the mockup: four quiet tabs and a raised red SOS button in the middle. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: layout.tabBarHeight + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        if (route.name === 'sos') {
          return (
            <ScalePressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel="SOS"
              accessibilityState={{ selected: focused }}
              haptic="medium"
              onPress={onPress}
              style={[styles.sos, { backgroundColor: focused ? colors.ink : colors.danger }]}>
              <Text variant="headline" color="white" style={styles.sosLabel}>
                SOS
              </Text>
            </ScalePressable>
          );
        }

        const Icon = meta.icon!;
        const tint = focused ? colors.ink : colors.iconMuted;
        return (
          <ScalePressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.tab}>
            <Icon size={24} color={tint} strokeWidth={1.8} />
            <Text variant="tabLabel" style={{ color: tint, fontFamily: focused ? 'Figtree_700Bold' : undefined }}>
              {meta.label}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  tab: { width: 64, minHeight: layout.minTouch, alignItems: 'center', gap: 3 },
  sos: {
    width: layout.sosTabSize,
    height: layout.sosTabSize,
    borderRadius: layout.sosTabSize / 2,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.white,
    ...shadows.sos,
  },
  sosLabel: { letterSpacing: 0.6, fontFamily: 'Figtree_800ExtraBold' },
});
