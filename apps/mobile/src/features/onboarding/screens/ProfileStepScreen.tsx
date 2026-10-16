import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { TextField } from '@/components/ui';
import { formatPhone, normalizePhone } from '@/features/contacts/phone';
import {
  CityPicker,
  EMPTY_MEDICAL,
  MedicalCardFields,
  hasMedicalInfo,
  type City,
} from '@/features/profile/components/ProfileFields';
import { useMedicalCard, useSaveMedicalCard, type MedicalCardInput } from '@/features/profile/hooks/useMedicalCard';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { colors } from '@/theme';

import { StepLayout } from '../components/StepLayout';

export function ProfileStepScreen() {
  const profile = useProfile();
  const medical = useMedicalCard();
  const updateProfile = useUpdateProfile();
  const saveMedical = useSaveMedicalCard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [card, setCard] = useState<MedicalCardInput>(EMPTY_MEDICAL);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; city?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Prefill from what sign-up already stored (resume-safe).
  useEffect(() => {
    if (hydrated || profile.isPending || medical.isPending) return;
    const p = profile.data;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from server data (guarded by `hydrated`)
    setName(p?.full_name ?? '');
    setPhone(p?.phone ? formatPhone(p.phone) : '');
    setCity(p?.city ?? null);
    if (medical.data) {
      const { blood_group, allergies, conditions, medications, notes } = medical.data;
      setCard({ blood_group, allergies, conditions, medications, notes });
    }
    setHydrated(true);
  }, [hydrated, profile.isPending, profile.data, medical.isPending, medical.data]);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    const found = {
      name: name.trim() ? undefined : 'Add your name.',
      phone: normalized ? undefined : 'Enter a valid mobile number.',
      city: city ? undefined : 'Choose your city.',
    };
    setErrors(found);
    if (found.name || found.phone || found.city) return;
    setSaveError(null);
    try {
      await updateProfile.mutateAsync({ full_name: name.trim(), phone: normalized, city });
      if (hasMedicalInfo(card) || medical.data) await saveMedical.mutateAsync(card);
      router.push('/onboarding/contacts');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save. Check your connection and try again.');
    }
  };

  return (
    <StepLayout
      step="profile"
      title="About you"
      subtitle="Your contacts will see this name in your SOS message."
      primaryLabel="Continue"
      onPrimary={submit}
      primaryLoading={updateProfile.isPending || saveMedical.isPending}
      footerNote={saveError}>
      {!hydrated ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            error={errors.name}
          />
          <TextField
            label="Your mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            placeholder="98765 43210"
            error={errors.phone}
          />
          <CityPicker value={city} onChange={setCity} error={errors.city} />
          <MedicalCardFields value={card} onChange={setCard} />
        </>
      )}
    </StepLayout>
  );
}
