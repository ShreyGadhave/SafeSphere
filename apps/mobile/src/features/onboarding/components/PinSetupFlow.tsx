import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinPad, Text } from '@/components/ui';
import { refreshPinsReady } from '@/features/auth/pinsState';
import { setPins } from '@/lib/pin';
import { colors, radius, spacing } from '@/theme';

export const PIN_DIGITS = 4;

type Phase = 'safe' | 'safeConfirm' | 'duress' | 'duressConfirm';

const COPY: Record<Phase, { title: string; body: string }> = {
  safe: {
    title: 'Choose a safety PIN',
    body: 'You’ll enter it to cancel an alert or to tell SafeSphere you’re OK.',
  },
  safeConfirm: { title: 'Enter it again', body: 'Just to be sure.' },
  duress: {
    title: 'Now a duress PIN',
    body: 'Use this one if someone forces you to cancel. The app will look cancelled, but your SOS keeps going silently.',
  },
  duressConfirm: { title: 'Enter the duress PIN again', body: 'Make it different from your safety PIN.' },
};

type PinSetupFlowProps = {
  /** Called after both PINs are saved on the device. */
  onDone: () => void;
  /** Reports the current phase so the parent can adapt its title (optional). */
  onPhaseChange?: (phase: Phase) => void;
};

/** Two PINs, each entered twice. Auto-advances when 4 digits are in. */
export function PinSetupFlow({ onDone, onPhaseChange }: PinSetupFlowProps) {
  const [phase, setPhase] = useState<Phase>('safe');
  const [value, setValue] = useState('');
  const [safePin, setSafePin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => onPhaseChange?.(phase), [phase, onPhaseChange]);

  const fail = (message: string, backTo: Phase) => {
    setError(message);
    setErrorKey((k) => k + 1);
    setValue('');
    setPhase(backTo);
  };

  const handleChange = async (next: string) => {
    setValue(next);
    if (next.length < PIN_DIGITS) {
      if (next.length > 0) setError(null);
      return;
    }
    switch (phase) {
      case 'safe':
        setSafePin(next);
        setValue('');
        setPhase('safeConfirm');
        return;
      case 'safeConfirm':
        if (next !== safePin) return fail('Those didn’t match. Choose your safety PIN again.', 'safe');
        setValue('');
        setPhase('duress');
        return;
      case 'duress':
        if (next === safePin) return fail('Use a different PIN from your safety PIN.', 'duress');
        setDuressPin(next);
        setValue('');
        setPhase('duressConfirm');
        return;
      case 'duressConfirm':
        if (next !== duressPin) return fail('Those didn’t match. Choose your duress PIN again.', 'duress');
        setSaving(true);
        try {
          await setPins(safePin, next);
          await refreshPinsReady();
          onDone();
        } catch (e) {
          fail(e instanceof Error ? e.message : 'Could not save your PINs.', 'safe');
        } finally {
          setSaving(false);
        }
    }
  };

  const isDuress = phase === 'duress' || phase === 'duressConfirm';

  return (
    <View style={styles.wrap}>
      <View style={[styles.explain, isDuress && styles.explainDuress]}>
        <Text variant="headline">{COPY[phase].title}</Text>
        <Text variant="caption" color="ink2">
          {COPY[phase].body}
        </Text>
      </View>
      <PinPad value={value} onChange={handleChange} length={PIN_DIGITS} errorKey={errorKey} disabled={saving} />
      <Text variant="footnote" color={error ? 'dangerText' : 'ink3'} align="center" style={styles.note}>
        {error ?? 'PINs are stored only on this phone, never on our servers.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl, alignItems: 'stretch' },
  explain: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, gap: spacing.xs },
  explainDuress: { backgroundColor: colors.warningTint },
  note: { minHeight: 32 },
});
