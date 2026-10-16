import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { usePinsReady } from '@/features/auth/pinsState';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { colors } from '@/theme';

import { resolveOnboardingStep } from '../steps';
import { getWelcomeSeen } from '../storage';

/** Entry of the onboarding stack: jumps to the first step that isn't done yet. */
export function OnboardingResumeScreen() {
  const profile = useProfile();
  const contacts = useContacts();
  const pinsReady = usePinsReady();
  const [welcomeSeen, setWelcomeSeenState] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void getWelcomeSeen().then(setWelcomeSeenState);
  }, []);

  const loading = profile.isPending || contacts.isPending || pinsReady === undefined || welcomeSeen === undefined;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const step = resolveOnboardingStep({
    welcomeSeen: !!welcomeSeen,
    profile: profile.data,
    contactCount: contacts.data?.length ?? 0,
    pinsSet: !!pinsReady,
  });
  return <Redirect href={`/onboarding/${step}`} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ground },
});
