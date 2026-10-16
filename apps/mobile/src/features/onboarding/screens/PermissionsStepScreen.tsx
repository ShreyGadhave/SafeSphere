import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useUser } from '@/features/auth/hooks/useSession';
import { useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { PERMISSION_INFO, getPermissionStatuses } from '@/lib/permissions';

import { PermissionsPanel, missingEssentials } from '../components/PermissionsPanel';
import { StepLayout } from '../components/StepLayout';
import { setOnboardedUser } from '../storage';

export function PermissionsStepScreen() {
  const user = useUser();
  const updateProfile = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({ onboarded_at: new Date().toISOString() });
      if (user) await setOnboardedUser(user.id);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup. Check your connection.');
    }
  };

  const onFinish = async () => {
    const missing = missingEssentials(await getPermissionStatuses());
    if (missing.length === 0) return void finish();
    Alert.alert(
      'Some protection is off',
      `Without ${missing.map((k) => PERMISSION_INFO[k].title.toLowerCase()).join(', ')}, SOS can’t do everything. You can turn these on later in Profile.`,
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'Finish anyway', onPress: () => void finish() },
      ],
    );
  };

  return (
    <StepLayout
      step="permissions"
      title="Turn on protection"
      subtitle="SafeSphere only uses these to keep you safe. Each one says why."
      primaryLabel="Finish setup"
      onPrimary={() => void onFinish()}
      primaryLoading={updateProfile.isPending}
      footerNote={error}>
      <PermissionsPanel />
    </StepLayout>
  );
}
