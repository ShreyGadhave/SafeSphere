import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function ContactsScreen() {
  return (
    <PlaceholderScreen
      title="Emergency contacts"
      description="Up to five people who get your SOS. One is primary and gets the call."
      planned={["Import from phone contacts","Mark primary","Send test alert"]}
    />
  );
}
