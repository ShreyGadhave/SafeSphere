import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

import { EMERGENCY_TYPES, SOS_TIMING } from '../constants';
import { useSos } from '../state/SosProvider';
import { CountdownRing } from './CountdownRing';

/** 5-second cancel window after the hold completes (B1). One tap cancels — nothing has been sent yet. */
export function CountdownOverlay() {
  const { secondsLeft, cancel, emergencyType, setEmergencyType } = useSos();

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text variant="sectionLabel" color="dangerText">
            Sending SOS
          </Text>
          <Text variant="largeTitle" align="center">
            Alerting your contacts in
          </Text>
        </View>

        <CountdownRing
          size={220}
          stroke={10}
          color={colors.danger}
          track={colors.white}
          durationS={SOS_TIMING.countdownS}>
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityLabel={`${secondsLeft} seconds`}
            style={styles.number}>
            {secondsLeft}
          </Text>
          <Text variant="footnote" color="ink3">
            SECONDS
          </Text>
        </CountdownRing>

        <View style={styles.types}>
          <Text variant="sectionLabel" color="ink3" align="center">
            What’s happening? (optional)
          </Text>
          <View style={styles.chips}>
            {EMERGENCY_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={emergencyType === t.value}
                onPress={() => setEmergencyType(emergencyType === t.value ? 'unknown' : t.value)}
              />
            ))}
          </View>
        </View>

        <Button label="Cancel" variant="primary" size="large" onPress={cancel} style={styles.cancel} />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.dangerTint, zIndex: 100 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xxl,
  },
  top: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  number: { fontFamily: 'Figtree_800ExtraBold', fontSize: 88, lineHeight: 96, color: colors.ink },
  types: { gap: spacing.md, alignSelf: 'stretch' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  cancel: { alignSelf: 'stretch' },
});
