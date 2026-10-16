import { PlaceholderScreen } from '@/components/ui';

// TODO: Phase 0 placeholder — replace with the real screen.
export function SignInScreen() {
  return (
    <PlaceholderScreen
      title="Sign in"
      description="Email and password sign-in with Supabase Auth."
      planned={["Email + password fields","Forgot password (email link)","Error states for wrong password / no network"]}
    />
  );
}
