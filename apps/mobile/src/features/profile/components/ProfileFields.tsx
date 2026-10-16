import { StyleSheet, View } from 'react-native';

import { Chip, SectionHeader, Text, TextField } from '@/components/ui';
import type { Enums } from '@/lib/supabase';
import { spacing } from '@/theme';

import { BLOOD_GROUPS, type MedicalCardInput } from '../hooks/useMedicalCard';

export type City = Enums<'city'>;

export const CITIES: { value: City; label: string }[] = [
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'navi_mumbai', label: 'Navi Mumbai' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'pune', label: 'Pune' },
];

export function cityLabel(city: City | null | undefined): string | null {
  return CITIES.find((c) => c.value === city)?.label ?? null;
}

export function CityPicker({ value, onChange, error }: { value: City | null; onChange: (c: City) => void; error?: string | null }) {
  return (
    <View style={styles.group}>
      <Text variant="footnote" color="ink2" style={styles.label}>
        Your city
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {CITIES.map((c) => (
          <Chip key={c.value} label={c.label} selected={value === c.value} onPress={() => onChange(c.value)} />
        ))}
      </View>
      {error ? (
        <Text variant="footnote" color="dangerText">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const EMPTY_MEDICAL: MedicalCardInput = {
  blood_group: null,
  allergies: null,
  conditions: null,
  medications: null,
  notes: null,
};

export function hasMedicalInfo(card: MedicalCardInput): boolean {
  return Object.values(card).some((v) => typeof v === 'string' && v.trim().length > 0);
}

/** Optional medical card. Shared with responders only during an SOS. */
export function MedicalCardFields({ value, onChange }: { value: MedicalCardInput; onChange: (next: MedicalCardInput) => void }) {
  const set = (key: keyof MedicalCardInput) => (text: string) => onChange({ ...value, [key]: text });

  return (
    <View style={styles.section}>
      <SectionHeader title="Medical card" note="(optional)" />
      <Text variant="footnote" color="ink3">
        Sent to your contacts and responders only during an SOS.
      </Text>
      <View style={styles.group}>
        <Text variant="footnote" color="ink2" style={styles.label}>
          Blood group
        </Text>
        <View style={styles.chips}>
          {BLOOD_GROUPS.map((g) => (
            <Chip
              key={g}
              label={g}
              selected={value.blood_group === g}
              onPress={() => onChange({ ...value, blood_group: value.blood_group === g ? null : g })}
            />
          ))}
        </View>
      </View>
      <TextField label="Allergies" value={value.allergies ?? ''} onChangeText={set('allergies')} placeholder="e.g. Penicillin" />
      <TextField label="Conditions" value={value.conditions ?? ''} onChangeText={set('conditions')} placeholder="e.g. Asthma, diabetes" />
      <TextField label="Medicines" value={value.medications ?? ''} onChangeText={set('medications')} placeholder="e.g. Inhaler" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  group: { gap: spacing.sm },
  label: { fontFamily: 'Figtree_600SemiBold', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
