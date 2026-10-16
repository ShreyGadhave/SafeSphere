import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function SosScreen() {
  return (
    <PlaceholderScreen
      title="Emergency"
      description="Press and hold for 3 seconds. You get 5 seconds to cancel."
      planned={["Hold-to-trigger button with progress ring","Emergency type chips","Helplines 112 / 100 / 108 / 1091"]}
      withTabBar
    />
  );
}
