import { router } from 'expo-router';
import { Lock, Route, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ProgressDots, Text } from '@/components/ui';
import { colors, spacing, type ColorName } from '@/theme';

import { setWelcomeSeen } from '../storage';

type Slide = { title: string; body: string; icon: LucideIcon; tint: ColorName; color: ColorName };

const SLIDES: Slide[] = [
  {
    title: 'Help, even when you can’t ask',
    body: 'Hold SOS, or let SafeSphere notice a fall or a scream. Your contacts get your live location by SMS — even without internet.',
    icon: ShieldCheck,
    tint: 'safeTint',
    color: 'safeText',
  },
  {
    title: 'Safer ways to get there',
    body: 'See the risk around you, pick the safest route, and let us watch your cab ride for wrong turns.',
    icon: Route,
    tint: 'infoTint',
    color: 'info',
  },
  {
    title: 'Private by design',
    body: 'Audio stays on your phone. Your location is shared only during a trip or an SOS, and links expire.',
    icon: Lock,
    tint: 'violetTint',
    color: 'violet',
  },
];

export function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken<Slide>[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }, []);

  const last = index === SLIDES.length - 1;
  const next = async () => {
    if (!last) {
      list.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    await setWelcomeSeen();
    router.push('/onboarding/profile');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.iconWell, { backgroundColor: colors[item.tint] }]}>
                <Icon size={56} color={colors[item.color]} strokeWidth={1.6} />
              </View>
              <Text variant="largeTitle" align="center">
                {item.title}
              </Text>
              <Text variant="body" color="ink2" align="center">
                {item.body}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.footer}>
        <ProgressDots total={SLIDES.length} current={index} />
        <Button label={last ? 'Get started' : 'Next'} size="large" stretch={false} style={styles.button} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, gap: spacing.lg },
  iconWell: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  footer: { alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg },
  button: { alignSelf: 'stretch' },
});
