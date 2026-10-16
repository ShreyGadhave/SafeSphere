import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function PinsScreen() {
  return (
    <PlaceholderScreen
      title="Safety PINs"
      description="A PIN to cancel alerts, and a duress PIN that looks like a cancel but silently keeps the SOS going."
      planned={["Set 4-digit safety PIN","Set different duress PIN","Stored hashed on device (SecureStore), never sent in plain text"]}
    />
  );
}
