import {
  Activity,
  HeartPulse,
  KeyRound,
  LogOut,
  Mic,
  ShieldCheck,
  Smartphone,
  Users,
  Volume2,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  Button,
  Card,
  FormScreen,
  ListRow,
  PinPad,
  Screen,
  SectionHeader,
  Text,
  Toggle,
} from '@/components/ui';
import { signOut } from '@/features/auth/services/authService';
import { ContactList } from '@/features/contacts/components/ContactList';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { formatPhone } from '@/features/contacts/phone';
import { PermissionsPanel, missingEssentials, usePermissionStatuses } from '@/features/onboarding/components/PermissionsPanel';
import { PIN_DIGITS, PinSetupFlow } from '@/features/onboarding/components/PinSetupFlow';
import { checkPin } from '@/lib/pin';
import { colors, fadeInUp, spacing } from '@/theme';

import { EMPTY_MEDICAL, MedicalCardFields, cityLabel, hasMedicalInfo } from '../components/ProfileFields';
import { useMedicalCard, useSaveMedicalCard, type MedicalCardInput } from '../hooks/useMedicalCard';
import { useProfile } from '../hooks/useProfile';
import { useSafetySettings } from '../settings';

type Sheet = 'medical' | 'contacts' | 'pins' | 'permissions' | null;

export function ProfileScreen() {
  const { data: profile } = useProfile();
  const { data: medical } = useMedicalCard();
  const { data: contacts = [] } = useContacts();
  const { statuses } = usePermissionStatuses();
  const { settings, update } = useSafetySettings();
  const [sheet, setSheet] = useState<Sheet>(null);

  const missing = missingEssentials(statuses);
  const primary = contacts.find((c) => c.is_primary);
  const medicalSummary = medical
    ? [medical.blood_group, medical.allergies && 'allergies', medical.conditions && 'conditions'].filter(Boolean).join(' · ')
    : '';

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your safety PINs and offline contacts will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen withTabBar>
      <Card entering={fadeInUp()} style={styles.header}>
        <Avatar name={profile?.full_name || '?'} size={56} ringColor={colors.card} />
        <View style={styles.headerText}>
          <Text variant="title">{profile?.full_name || 'Your profile'}</Text>
          <Text variant="caption" color="ink3">
            {[profile?.phone && formatPhone(profile.phone), cityLabel(profile?.city)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>

      <SectionHeader title="Safety net" />
      <Card flush entering={fadeInUp(1)}>
        <ListRow
          icon={Users}
          title="Emergency contacts"
          subtitle={primary ? `${contacts.length} · primary: ${primary.name}` : 'Add someone to alert'}
          onPress={() => setSheet('contacts')}
        />
        <ListRow
          icon={HeartPulse}
          title="Medical card"
          subtitle={medicalSummary || 'Optional — shared only during an SOS'}
          onPress={() => setSheet('medical')}
        />
        <ListRow icon={KeyRound} title="Safety & duress PIN" subtitle="Change your PINs" onPress={() => setSheet('pins')} />
        <ListRow
          icon={ShieldCheck}
          title="Permissions"
          subtitle={missing.length ? `${missing.length} needed for full protection` : 'All protection is on'}
          divider={false}
          onPress={() => setSheet('permissions')}
          accessory={missing.length ? <View style={styles.warnDot} accessibilityLabel="Needs attention" /> : undefined}
        />
      </Card>

      <SectionHeader title="AI protection" />
      <Card flush entering={fadeInUp(2)}>
        <ListRow
          icon={Activity}
          title="Fall & snatch detection"
          subtitle="On-device AI · motion"
          accessory={
            <Toggle value={settings.fallDetection} onValueChange={(v) => void update({ fallDetection: v })} accessibilityLabel="Fall and snatch detection" />
          }
        />
        <ListRow
          icon={Mic}
          title="Scream detection"
          subtitle="Listens only during trips"
          accessory={
            <Toggle value={settings.screamDetection} onValueChange={(v) => void update({ screamDetection: v })} accessibilityLabel="Scream detection" />
          }
        />
        <ListRow
          icon={Smartphone}
          title="Shake for SOS"
          subtitle="3 quick shakes"
          accessory={<Toggle value={settings.shake} onValueChange={(v) => void update({ shake: v })} accessibilityLabel="Shake for SOS" />}
        />
        <ListRow
          icon={Volume2}
          title="Siren during SOS"
          subtitle={settings.sirenMode ? 'Loud alarm plays' : 'Silent — nothing on screen draws attention'}
          divider={false}
          accessory={<Toggle value={settings.sirenMode} onValueChange={(v) => void update({ sirenMode: v })} accessibilityLabel="Siren during SOS" />}
        />
      </Card>

      <Card flush entering={fadeInUp(3)}>
        <ListRow icon={LogOut} title="Sign out" divider={false} onPress={confirmSignOut} accessory={null} />
      </Card>

      <SheetModal visible={sheet === 'contacts'} title="Emergency contacts" onClose={() => setSheet(null)}>
        <Text variant="caption" color="ink3">
          Tap a contact to edit. Long-press to remove.
        </Text>
        <ContactList />
      </SheetModal>
      <SheetModal visible={sheet === 'permissions'} title="Permissions" onClose={() => setSheet(null)}>
        <PermissionsPanel compact />
      </SheetModal>
      <Modal visible={sheet === 'medical'} animationType="slide" onRequestClose={() => setSheet(null)}>
        {sheet === 'medical' ? <MedicalEditor initial={medical ?? null} onClose={() => setSheet(null)} /> : null}
      </Modal>
      <Modal visible={sheet === 'pins'} animationType="slide" onRequestClose={() => setSheet(null)}>
        {sheet === 'pins' ? <ChangePins onClose={() => setSheet(null)} /> : null}
      </Modal>
    </Screen>
  );
}

function SheetModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FormScreen footer={<Button label="Done" size="large" onPress={onClose} />}>
        <Text variant="largeTitle" style={styles.sheetTitle}>
          {title}
        </Text>
        {children}
      </FormScreen>
    </Modal>
  );
}

function MedicalEditor({ initial, onClose }: { initial: MedicalCardInput | null; onClose: () => void }) {
  const save = useSaveMedicalCard();
  const [card, setCard] = useState<MedicalCardInput>(
    initial
      ? {
          blood_group: initial.blood_group,
          allergies: initial.allergies,
          conditions: initial.conditions,
          medications: initial.medications,
          notes: initial.notes,
        }
      : EMPTY_MEDICAL,
  );
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      if (hasMedicalInfo(card) || initial) await save.mutateAsync(card);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <FormScreen
      footer={
        <>
          {error ? (
            <Text variant="footnote" color="dangerText" align="center">
              {error}
            </Text>
          ) : null}
          <Button label="Save" size="large" loading={save.isPending} onPress={submit} />
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </>
      }>
      <Text variant="largeTitle" style={styles.sheetTitle}>
        Medical card
      </Text>
      <MedicalCardFields value={card} onChange={setCard} />
    </FormScreen>
  );
}

/** Changing PINs needs the current safety PIN first (a duress PIN doesn't unlock this). */
function ChangePins({ onClose }: { onClose: () => void }) {
  const [verified, setVerified] = useState(false);
  const [value, setValue] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (next: string) => {
    setValue(next);
    if (next.length < PIN_DIGITS) return;
    if ((await checkPin(next)) === 'safe') {
      setVerified(true);
      return;
    }
    setError('That’s not your safety PIN.');
    setErrorKey((k) => k + 1);
    setValue('');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.pinRoot}>
      <View style={styles.pinTop}>
        <Text variant="largeTitle">{verified ? 'New PINs' : 'Enter your safety PIN'}</Text>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
      </View>
      {verified ? (
        <PinSetupFlow
          onDone={() => {
            Alert.alert('PINs updated', 'Your new safety and duress PINs are saved on this phone.');
            onClose();
          }}
        />
      ) : (
        <View style={styles.pinBody}>
          <PinPad value={value} onChange={onChange} length={PIN_DIGITS} errorKey={errorKey} />
          <Text variant="footnote" color={error ? 'dangerText' : 'ink3'} align="center">
            {error ?? 'Your current PIN is needed to change it.'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerText: { flex: 1, gap: 2 },
  warnDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning },
  sheetTitle: { marginTop: spacing.sm },
  pinRoot: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: spacing.gutter, gap: spacing.xl },
  pinTop: { gap: spacing.md, paddingTop: spacing.lg },
  pinBody: { gap: spacing.xl, paddingTop: spacing.xl },
});
