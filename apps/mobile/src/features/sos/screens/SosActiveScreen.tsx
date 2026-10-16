import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function SosActiveScreen() {
  return (
    <PlaceholderScreen
      title="Help is on the way"
      description="Live status of everything SafeSphere did after the SOS fired."
      planned={["SMS from your own number (works offline)","Direct call to primary contact","Audio evidence chunks","Guardians responding","I'm safe → PIN / duress PIN"]}
    />
  );
}
