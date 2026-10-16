import { router } from 'expo-router';
import { HandHeart, Siren } from 'lucide-react-native';
import { Alert } from 'react-native';

import { Card, ListRow, Toggle } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { fadeInUp } from '@/theme';

import { updateGuardianLocation } from './presence';

/** Profile section for the volunteer guardian network (F1). */
export function GuardianCard({ index }: { index: number }) {
  const profile = useProfile();
  const update = useUpdateProfile();
  const p = profile.data;
  if (!p) return null;

  const request = () =>
    Alert.alert(
      'Volunteer as a guardian?',
      'Verified guardians get a notification when someone within 5 km raises an SOS, and can choose to help. An admin reviews your request first.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Request', onPress: () => update.mutate({ guardian_status: 'pending' }) },
      ],
    );

  if (p.guardian_status === 'verified') {
    return (
      <Card flush entering={fadeInUp(index)}>
        <ListRow
          icon={HandHeart}
          title="Available to respond"
          subtitle={p.guardian_available ? 'You get SOS alerts within 5 km' : 'You are off duty'}
          accessory={
            <Toggle
              value={p.guardian_available}
              accessibilityLabel="Available to respond as a guardian"
              onValueChange={(on) => {
                update.mutate({ guardian_available: on });
                if (on) void updateGuardianLocation(p.id);
              }}
            />
          }
        />
        <ListRow icon={Siren} title="Nearby SOS" subtitle="Alerts near you right now" divider={false} onPress={() => router.push('/guardian')} />
      </Card>
    );
  }

  return (
    <Card flush entering={fadeInUp(index)}>
      <ListRow
        icon={HandHeart}
        title="Volunteer as a guardian"
        subtitle={
          p.guardian_status === 'pending'
            ? 'Request sent — waiting for an admin to verify you'
            : 'Help people near you when they raise an SOS'
        }
        divider={false}
        onPress={p.guardian_status === 'pending' ? undefined : request}
      />
    </Card>
  );
}
