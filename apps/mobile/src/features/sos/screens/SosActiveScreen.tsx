import { router, useFocusEffect } from 'expo-router';
import { AlertTriangle, Check, CircleDot, MinusCircle, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/components/ui';
import { colors, fadeInUp, radius, spacing } from '@/theme';

import { PinPad } from '../components/PinPad';
import { EMERGENCY_TYPE_LABEL, SOS_TIMING } from '../constants';
import type { StepStatus, TimelineStep } from '../services/sosEngine';
import { useSos } from '../state/SosProvider';

function elapsed(fromIso: string | null, now: number): string {
  if (!fromIso) return '00:00';
  const s = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function BeatingDot() {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) {
      t.set(withRepeat(withSequence(withTiming(1.35, { duration: 600 }), withTiming(1, { duration: 600 })), -1));
    }
  }, [t, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: t.get() }], opacity: 1.35 - (t.get() - 1) * 1.3 }));
  return <Animated.View style={[styles.dot, style]} />;
}

const STATUS_ICON: Record<StepStatus, { Icon: typeof Check; fg: string; bg: string }> = {
  done: { Icon: Check, fg: colors.safeText, bg: colors.safeTint },
  pending: { Icon: CircleDot, fg: colors.info, bg: colors.infoTint },
  failed: { Icon: AlertTriangle, fg: colors.warningTextAlt, bg: colors.warningTint },
  skipped: { Icon: MinusCircle, fg: colors.ink3, bg: colors.fill },
};

function StepRow({ step, index, last }: { step: TimelineStep; index: number; last: boolean }) {
  const { Icon, fg, bg } = STATUS_ICON[step.status];
  const at = new Date(step.at);
  return (
    <Animated.View entering={fadeInUp(index)} style={[styles.step, !last && styles.stepDivider]}>
      <View style={[styles.stepIcon, { backgroundColor: bg }]}>
        <Icon size={16} color={fg} strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" style={styles.stepTitle}>
          {step.title}
        </Text>
        {step.detail ? (
          <Text variant="caption" color="ink3">
            {step.detail}
          </Text>
        ) : null}
      </View>
      <Text variant="footnote" color="ink3">
        {`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`}
      </Text>
    </Animated.View>
  );
}

export function SosActiveScreen() {
  const { phase, activatedAt, emergencyType, timeline, lastFix, submitPin, wrongPinAttempts, dismiss } = useSos();
  const [now, setNow] = useState(() => Date.now());
  const [askPin, setAskPin] = useState(false);
  const [errorSignal, setErrorSignal] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Nothing to show if the user lands here without an SOS (e.g. a stale deep link).
  useEffect(() => {
    if (phase === 'idle') router.replace('/(tabs)/sos');
  }, [phase]);

  // The hardware back button must not leave an active SOS screen by accident.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => phase === 'active');
      return () => sub.remove();
    }, [phase]),
  );

  const onPin = async (pin: string) => {
    setChecking(true);
    const result = await submitPin(pin);
    setChecking(false);
    if (result === 'wrong') setErrorSignal((n) => n + 1);
  };

  if (phase === 'resolved') {
    return (
      <SafeAreaView style={[styles.root, styles.resolved]}>
        <Animated.View entering={fadeInUp(0)} style={styles.resolvedBody}>
          <View style={styles.resolvedIcon}>
            <ShieldCheck size={40} color={colors.safeText} strokeWidth={1.8} />
          </View>
          <Text variant="largeTitle" align="center">
            You’re marked safe
          </Text>
          <Text variant="body" color="ink2" align="center">
            The SOS is cancelled and your contacts have been told you’re safe.
          </Text>
        </Animated.View>
        <Button
          label="Done"
          size="large"
          onPress={() => {
            dismiss();
            router.replace('/(tabs)');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
      <View style={styles.band}>
        <SafeAreaView edges={['top']}>
          <View style={styles.bandTop}>
            <View style={styles.row}>
              <BeatingDot />
              <Text variant="sectionLabel" color="dangerText">
                SOS active
              </Text>
            </View>
            <Text variant="headline" color="dangerText" style={styles.mono}>
              {elapsed(activatedAt, now)}
            </Text>
          </View>
          <Text variant="largeTitle" accessibilityRole="header">
            Help is on the way
          </Text>
          <Text variant="body" color="ink2">
            {EMERGENCY_TYPE_LABEL[emergencyType]}. Your contacts can see where you are. Stay on this screen if
            you can.
          </Text>
        </SafeAreaView>
      </View>

      {askPin ? (
        <View style={styles.pinArea}>
          <Text variant="title" align="center">
            Enter your safety PIN
          </Text>
          {wrongPinAttempts > 0 ? (
            <Text variant="subhead" color="dangerText" align="center">
              Wrong PIN · {SOS_TIMING.maxWrongPins - wrongPinAttempts} tries left
            </Text>
          ) : (
            <Text variant="caption" color="ink3" align="center">
              The SOS keeps running until the right PIN is entered.
            </Text>
          )}
          <PinPad onSubmit={(pin) => void onPin(pin)} errorSignal={errorSignal} busy={checking} />
          <Button label="Back" variant="secondary" onPress={() => setAskPin(false)} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* TODO(phase-2): replace with a MapLibre mini map showing the live trail. */}
            <Card style={styles.locationCard}>
              <Text variant="sectionLabel" color="ink3">
                Your location
              </Text>
              {lastFix ? (
                <>
                  <Text variant="headline" style={styles.mono}>
                    {lastFix.latitude.toFixed(5)}, {lastFix.longitude.toFixed(5)}
                  </Text>
                  <Text variant="caption" color="ink3">
                    Live{lastFix.accuracy != null ? ` · ±${Math.round(lastFix.accuracy)} m` : ''} · updates every 5 s
                  </Text>
                </>
              ) : (
                <Text variant="subhead" color="ink2">
                  Finding your location…
                </Text>
              )}
            </Card>

            <View style={styles.timeline}>
              {timeline.length === 0 ? (
                <Text variant="subhead" color="ink3">
                  Alerting your contacts…
                </Text>
              ) : (
                timeline.map((step, i) => (
                  <StepRow key={step.kind} step={step} index={i} last={i === timeline.length - 1} />
                ))
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button label="I'm safe · enter PIN" size="large" stretch onPress={() => setAskPin(true)} />
            <Button
              label="Call 112"
              variant="tinted-danger"
              size="large"
              onPress={() => void Linking.openURL('tel:112')}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.card },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mono: { fontVariant: ['tabular-nums'] },
  band: {
    backgroundColor: colors.dangerTint,
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  bandTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  content: { padding: spacing.lg, gap: spacing.lg },
  locationCard: { gap: spacing.xs, backgroundColor: colors.ground },
  timeline: {},
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md - 1 },
  stepDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  stepIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: spacing.md - 2, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  pinArea: { flex: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  resolved: { padding: spacing.gutter, justifyContent: 'space-between' },
  resolvedBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  resolvedIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.safeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
