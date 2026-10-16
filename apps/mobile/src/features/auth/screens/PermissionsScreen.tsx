import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function PermissionsScreen() {
  return (
    <PlaceholderScreen
      title="Permissions"
      description="Explain each permission before Android asks for it."
      planned={["Location → \"Allow all the time\" (own screen on Android 10+)","Microphone, notifications (Android 13+), contacts","SMS and phone calls for offline SOS"]}
    />
  );
}
