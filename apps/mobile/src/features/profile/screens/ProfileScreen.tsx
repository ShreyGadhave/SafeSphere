import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="Profile"
      description="Your details, contacts, PINs and AI trigger settings."
      planned={["Profile + medical card","Emergency contacts","Safety and duress PIN","AI trigger sensitivity","Evidence vault, trip history","Guardian mode"]}
      withTabBar
    />
  );
}
