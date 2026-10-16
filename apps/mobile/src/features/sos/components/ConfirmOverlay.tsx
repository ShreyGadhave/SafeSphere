import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { SOS_TIMING, type AlertTrigger } from '../constants';
import { useSos } from '../state/SosProvider';
import { CountdownRing } from './CountdownRing';

const REASON: Partial<Record<AlertTrigger, { title: string; body: string }>> = {
  motion: { title: 'Did you fall?', body: 'We felt a hard fall or a sudden snatch.' },
  audio: { title: 'Are you OK?', body: 'We heard what sounded like a scream or a call for help.' },
  shake: { title: 'Are you OK?', body: 'You shook your phone hard three times.' },
  ride_anomaly: { title: 'Your ride changed course', body: 'The cab moved away from the expected route.' },
  walk_checkin: { title: 'Are you OK?', body: "You didn't check in on your walk." },
  checkin_timeout: { title: 'Are you OK?', body: "Your check-in timer ran out." },
  low_battery: { title: 'Battery almost empty', body: 'Your phone may switch off during the trip.' },
};

/**
 * B5: every AI-detected trigger asks first. No answer in 10 s → the normal 5 s countdown starts,
 * so a false alarm always has two chances to be stopped.
 */
export function ConfirmOverlay() {
  const { secondsLeft, trigger, confirmOk, escalate } = useSos();
  const reason = (trigger && REASON[trigger]) ?? { title: 'Are you OK?', body: 'Something looked wrong.' };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.scrim}>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <Animated.View entering={SlideInDown.springify().damping(16)} style={styles.sheet}>
          <CountdownRing
            size={104}
            stroke={8}
            color={colors.danger}
            track={colors.dangerTint}
            durationS={SOS_TIMING.confirmS}>
            <Text style={styles.number} accessibilityLiveRegion="assertive">
              {secondsLeft}
            </Text>
            <Text variant="footnote" color="ink3">
              SECONDS
            </Text>
          </CountdownRing>
          <View style={styles.copy}>
            <Text variant="title" align="center" accessibilityRole="header">
              {reason.title}
            </Text>
            <Text variant="body" color="ink2" align="center">
              {reason.body} If you don’t answer, your emergency contacts get an SOS.
            </Text>
          </View>
          <View style={styles.actions}>
            <Button label="I'm OK" variant="primary" size="large" onPress={confirmOk} />
            <Button label="Send SOS" variant="danger" size="large" onPress={escalate} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim, zIndex: 100 },
  safe: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  copy: { gap: spacing.sm },
  number: { fontFamily: 'Figtree_800ExtraBold', fontSize: 34, lineHeight: 38, color: colors.ink },
  actions: { alignSelf: 'stretch', gap: spacing.md - 2, borderRadius: radius.button },
});
