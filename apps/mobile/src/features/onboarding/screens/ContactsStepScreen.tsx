import { router } from 'expo-router';

import { Text } from '@/components/ui';
import { ContactList } from '@/features/contacts/components/ContactList';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { MAX_CONTACTS } from '@/features/contacts/rules';

import { StepLayout } from '../components/StepLayout';

export function ContactsStepScreen() {
  const { data: contacts = [] } = useContacts();
  const ready = contacts.length >= 1;

  return (
    <StepLayout
      step="contacts"
      title="Who should we alert?"
      subtitle={`Add 1 to ${MAX_CONTACTS} people. In an SOS they get an SMS with your live location, and your primary contact gets a call.`}
      primaryLabel="Continue"
      primaryDisabled={!ready}
      onPrimary={() => router.push('/onboarding/pins')}>
      <ContactList />
      {!ready ? (
        <Text variant="footnote" color="ink3" align="center">
          Add at least one contact to continue.
        </Text>
      ) : null}
    </StepLayout>
  );
}
