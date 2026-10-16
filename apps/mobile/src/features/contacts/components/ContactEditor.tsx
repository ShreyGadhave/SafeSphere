import { BookUser } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';

import { Button, FormScreen, ListRow, Text, TextField, Toggle } from '@/components/ui';
import { openAppSettings } from '@/lib/permissions';
import { colors, radius, spacing } from '@/theme';

import { useContacts, useSaveContact, type EmergencyContact } from '../hooks/useContacts';
import { formatPhone } from '../phone';
import { hasErrors, validateContactDraft, type ContactDraftErrors } from '../rules';
import { pickDeviceContact } from '../services/deviceContacts';

type ContactEditorProps = {
  visible: boolean;
  /** Edit this contact; omit to add a new one. */
  contact?: EmergencyContact | null;
  onClose: () => void;
};

/** Full-screen sheet for adding or editing an emergency contact. */
export function ContactEditor({ visible, contact, onClose }: ContactEditorProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {visible ? <ContactForm contact={contact ?? null} onClose={onClose} /> : null}
    </Modal>
  );
}

function ContactForm({ contact, onClose }: { contact: EmergencyContact | null; onClose: () => void }) {
  const { data: contacts = [] } = useContacts();
  const save = useSaveContact();
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact ? formatPhone(contact.phone) : '');
  const [relation, setRelation] = useState(contact?.relation ?? '');
  const [primary, setPrimary] = useState(contact?.is_primary ?? contacts.length === 0);
  const [errors, setErrors] = useState<ContactDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const importContact = async () => {
    const result = await pickDeviceContact();
    if (result.status === 'picked') {
      setName(result.contact.name);
      setPhone(formatPhone(result.contact.phone));
      setErrors({});
    } else if (result.status === 'no-phone') {
      setName(result.name);
      setErrors({ phone: `${result.name || 'This contact'} has no usable phone number. Type it in.` });
    } else if (result.status === 'permission' && result.state === 'blocked') {
      Alert.alert('Contacts access is off', 'Allow Contacts for SafeSphere in Settings, or type the number in.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void openAppSettings() },
      ]);
    }
  };

  const submit = async () => {
    const found = validateContactDraft({ name, phone, relation }, contacts, contact?.id);
    setErrors(found);
    if (hasErrors(found)) return;
    setFormError(null);
    try {
      await save.mutateAsync({ id: contact?.id, name, phone, relation, isPrimary: primary });
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  };

  const isPrimaryLocked = contact?.is_primary === true || contacts.length === 0;

  return (
    <FormScreen
      footer={
        <>
          {formError ? (
            <Text variant="footnote" color="dangerText" align="center">
              {formError}
            </Text>
          ) : null}
          <Button label={contact ? 'Save contact' : 'Add contact'} size="large" loading={save.isPending} onPress={submit} />
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </>
      }>
      <View style={styles.header}>
        <Text variant="largeTitle">{contact ? 'Edit contact' : 'Add a contact'}</Text>
        <Text variant="body" color="ink2">
          They get an SMS with your live location when you need help.
        </Text>
      </View>

      {!contact ? <Button label="Choose from phone contacts" variant="secondary" icon={BookUser} onPress={importContact} /> : null}

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mom"
        autoCapitalize="words"
        textContentType="name"
        error={errors.name}
        returnKeyType="next"
      />
      <TextField
        label="Mobile number"
        value={phone}
        onChangeText={setPhone}
        placeholder="98765 43210"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        error={errors.phone}
        hint="Indian numbers get +91 added automatically."
      />
      <TextField
        label="Relation (optional)"
        value={relation}
        onChangeText={setRelation}
        placeholder="e.g. Mother, Friend"
        autoCapitalize="words"
      />

      <View style={styles.primaryCard}>
        <ListRow
          title="Primary contact"
          subtitle={isPrimaryLocked ? 'Called automatically during an SOS' : 'Call this person automatically during an SOS'}
          divider={false}
          accessory={
            <Toggle
              value={primary}
              disabled={isPrimaryLocked}
              onValueChange={setPrimary}
              accessibilityLabel="Primary contact"
            />
          }
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.sm },
  primaryCard: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
});
