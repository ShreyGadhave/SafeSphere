import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function SignUpScreen() {
  return (
    <PlaceholderScreen
      title="Create account"
      description="Email sign-up. Phone OTP is skipped because SMS OTP costs money."
      planned={["Name, email, password","City picker: Mumbai, Navi Mumbai, Delhi, Pune","Terms + privacy note"]}
    />
  );
}
