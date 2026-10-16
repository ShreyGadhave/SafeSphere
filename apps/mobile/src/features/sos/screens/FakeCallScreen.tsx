import { router } from 'expo-router';
import { Phone, PhoneOff, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, Vibration, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Chip, ScalePressable, Text } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';

type Stage = 'setup' | 'waiting' | 'ringing' | 'in-call';

const CALLERS = ['Mom', 'Dad', 'Office', 'Riya'];
const DELAYS = [
  { label: 'Now', s: 0 },
  { label: '10 s', s: 10 },
  { label: '30 s', s: 30 },
  { label: '1 min', s: 60 },
];

/** Android's default ring cadence, as vibration. */
const RING_PATTERN = [0, 1000, 1000];

function mmss(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function PulsingAvatar({ name }: { name: string }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) {
      t.set(withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
    }
  }, [t, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: t.get() }] }));
  return (
    <Animated.View style={style}>
      <Avatar name={name} size={112} ringColor="transparent" />
    </Animated.View>
  );
}

/** G1: a believable incoming call to get out of an uncomfortable situation. */
export function FakeCallScreen() {
  const [stage, setStage] = useState<Stage>('setup');
  const [caller, setCaller] = useState('Mom');
  const [delayS, setDelayS] = useState(10);
  const [left, setLeft] = useState(0);
  const [callS, setCallS] = useState(0);

  // Waiting → ringing.
  useEffect(() => {
    if (stage !== 'waiting') return;
    const started = Date.now();
    const t = setInterval(() => {
      const remaining = delayS - Math.floor((Date.now() - started) / 1000);
      if (remaining <= 0) {
        clearInterval(t);
        setStage('ringing');
      } else setLeft(remaining);
    }, 250);
    return () => clearInterval(t);
  }, [stage, delayS]);

  // Ringing: vibrate like a real call. TODO(asset): add a ringtone sound.
  useEffect(() => {
    if (stage !== 'ringing') return;
    Vibration.vibrate(RING_PATTERN, true);
    return () => Vibration.cancel();
  }, [stage]);

  // In-call timer.
  useEffect(() => {
    if (stage !== 'in-call') return;
    const t = setInterval(() => setCallS((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const close = () => {
    Vibration.cancel();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (stage === 'setup' || stage === 'waiting') {
    return (
      <SafeAreaView style={styles.setup}>
        <View style={styles.setupHeader}>
          <Text variant="largeTitle">Fake call</Text>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.close}>
            <X size={22} color={colors.ink} strokeWidth={1.8} />
          </ScalePressable>
        </View>
        <Text variant="body" color="ink2">
          Your phone will ring with a call you can answer — a polite way out of an uncomfortable situation.
        </Text>

        <View style={styles.section}>
          <Text variant="sectionLabel" color="ink3">
            Who’s calling
          </Text>
          <View style={styles.chips}>
            {CALLERS.map((c) => (
              <Chip key={c} label={c} selected={caller === c} onPress={() => setCaller(c)} />
            ))}
          </View>
          <TextInput
            value={caller}
            onChangeText={setCaller}
            placeholder="Caller name"
            placeholderTextColor={colors.ink3}
            accessibilityLabel="Caller name"
            maxLength={30}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text variant="sectionLabel" color="ink3">
            Ring in
          </Text>
          <View style={styles.chips}>
            {DELAYS.map((d) => (
              <Chip key={d.label} label={d.label} selected={delayS === d.s} onPress={() => setDelayS(d.s)} />
            ))}
          </View>
        </View>

        <View style={styles.flex} />
        {stage === 'waiting' ? (
          <View style={styles.section}>
            <Text variant="headline" align="center">
              Ringing in {left} s — you can lock your screen
            </Text>
            <Button label="Cancel" variant="secondary" size="large" onPress={() => setStage('setup')} />
          </View>
        ) : (
          <Button
            label={delayS ? `Ring in ${DELAYS.find((d) => d.s === delayS)?.label}` : 'Ring now'}
            size="large"
            disabled={!caller.trim()}
            onPress={() => {
              setLeft(delayS);
              setStage(delayS ? 'waiting' : 'ringing');
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  const name = caller.trim() || 'Unknown';
  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.call}>
      <SafeAreaView style={styles.callInner}>
        <View style={styles.callTop}>
          <Text variant="subhead" color="white" style={styles.dim}>
            {stage === 'ringing' ? 'Incoming call' : mmss(callS)}
          </Text>
          <Text style={styles.callerName}>{name}</Text>
          <Text variant="subhead" color="white" style={styles.dim}>
            Mobile
          </Text>
        </View>
        {stage === 'ringing' ? <PulsingAvatar name={name} /> : <Avatar name={name} size={112} ringColor="transparent" />}
        <View style={styles.callActions}>
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel="Decline"
            haptic="medium"
            onPress={close}
            style={[styles.roundBtn, { backgroundColor: colors.danger }]}>
            <PhoneOff size={30} color={colors.white} strokeWidth={1.8} />
          </ScalePressable>
          {stage === 'ringing' ? (
            <ScalePressable
              accessibilityRole="button"
              accessibilityLabel="Answer"
              haptic="medium"
              onPress={() => {
                Vibration.cancel();
                setCallS(0);
                setStage('in-call');
              }}
              style={[styles.roundBtn, { backgroundColor: colors.safe }]}>
              <Phone size={30} color={colors.white} strokeWidth={1.8} />
            </ScalePressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  setup: { flex: 1, backgroundColor: colors.ground, padding: spacing.gutter, gap: spacing.lg },
  setupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.md - 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    height: 50,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  // A real call screen is dark; this one screen intentionally leaves the light theme.
  call: { flex: 1, backgroundColor: '#111827' },
  callInner: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xxxl * 2 },
  callTop: { alignItems: 'center', gap: spacing.xs },
  callerName: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, color: colors.white },
  dim: { opacity: 0.75 },
  callActions: { flexDirection: 'row', gap: 96 },
  roundBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
