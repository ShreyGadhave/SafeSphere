import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, FormScreen, ProgressDots, ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, spacing } from '@/theme';

import { ONBOARDING_STEPS, previousStep, type OnboardingStep } from '../steps';

type StepLayoutProps = {
  step: OnboardingStep;
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  /** Shown above the primary button, e.g. a save error. */
  footerNote?: string | null;
};

export function goBackFrom(step: OnboardingStep) {
  if (router.canGoBack()) router.back();
  else {
    const prev = previousStep(step);
    if (prev) router.replace(`/onboarding/${prev}`);
  }
}

/** Shared frame for onboarding steps: back + progress, title, content, sticky primary button. */
export function StepLayout({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  footerNote,
}: StepLayoutProps) {
  const index = ONBOARDING_STEPS.indexOf(step);
  // The welcome slides have their own dots; numbered progress covers the setup steps.
  const setupSteps = ONBOARDING_STEPS.length - 1;

  return (
    <FormScreen
      footer={
        <>
          {footerNote ? (
            <Text variant="footnote" color="dangerText" align="center">
              {footerNote}
            </Text>
          ) : null}
          <Button
            label={primaryLabel}
            size="large"
            loading={primaryLoading}
            disabled={primaryDisabled}
            onPress={onPrimary}
          />
        </>
      }>
      <View style={styles.topBar}>
        {index > 0 ? (
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => goBackFrom(step)}
            style={styles.back}>
            <ChevronLeft size={24} color={colors.ink} strokeWidth={1.8} />
          </ScalePressable>
        ) : (
          <View style={styles.back} />
        )}
        <ProgressDots total={setupSteps} current={Math.max(0, index - 1)} />
        <View style={styles.back} />
      </View>
      <Animated.View entering={fadeInUp()} style={styles.header}>
        <Text variant="largeTitle">{title}</Text>
        <Text variant="body" color="ink2">
          {subtitle}
        </Text>
      </Animated.View>
      <Animated.View entering={fadeInUp(1)} style={styles.body}>
        {children}
      </Animated.View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { gap: spacing.xs },
  body: { gap: spacing.lg },
});
