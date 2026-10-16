import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots, ScalePressable, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

import { goBackFrom } from '../components/StepLayout';
import { PinSetupFlow } from '../components/PinSetupFlow';
import { ONBOARDING_STEPS } from '../steps';

/** PIN step uses its own frame: the keypad replaces the keyboard and the "Continue" button. */
export function PinsStepScreen() {
  const index = ONBOARDING_STEPS.indexOf('pins');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.topBar}>
        <ScalePressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBackFrom('pins')} style={styles.back}>
          <ChevronLeft size={24} color={colors.ink} strokeWidth={1.8} />
        </ScalePressable>
        <ProgressDots total={ONBOARDING_STEPS.length - 1} current={index - 1} />
        <View style={styles.back} />
      </View>
      <View style={styles.content}>
        <Text variant="largeTitle">Your safety PINs</Text>
        <PinSetupFlow onDone={() => router.push('/onboarding/permissions')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: spacing.gutter },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: spacing.lg, paddingTop: spacing.lg },
});
