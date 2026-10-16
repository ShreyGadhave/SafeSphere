/** Pure onboarding / gate rules — no React, no I/O, so they are unit-tested directly. */

export const ONBOARDING_STEPS = ['welcome', 'profile', 'contacts', 'pins', 'permissions'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type ProfileFacts = { full_name: string; phone: string | null; city: string | null } | null | undefined;

export function isProfileComplete(profile: ProfileFacts): boolean {
  return !!profile && profile.full_name.trim().length > 0 && !!profile.phone && !!profile.city;
}

export type OnboardingFacts = {
  welcomeSeen: boolean;
  profile: ProfileFacts;
  contactCount: number;
  pinsSet: boolean;
  /** Set when this account already finished onboarding (on this or another device). */
  onboardedAt?: string | null;
};

/**
 * First step that still needs doing, so onboarding resumes where the user left off.
 * Returning users (signed out and back in, or a new phone) already have their profile and contacts
 * on the server; only the safety PINs live on the device and are wiped on sign-out, so they go
 * straight to the PIN step.
 */
export function resolveOnboardingStep(facts: OnboardingFacts): OnboardingStep {
  if (facts.onboardedAt) return 'pins';
  if (!facts.welcomeSeen) return 'welcome';
  if (!isProfileComplete(facts.profile)) return 'profile';
  if (facts.contactCount < 1) return 'contacts';
  if (!facts.pinsSet) return 'pins';
  return 'permissions';
}

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[i + 1] ?? null;
}

export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : null;
}

export type AppGate = 'loading' | 'signedOut' | 'onboarding' | 'ready';

export type GateFacts = {
  /** undefined = session still loading. */
  hasSession: boolean | undefined;
  profileStatus: 'pending' | 'error' | 'success';
  onboardedAt: string | null | undefined;
  /** undefined = SecureStore still being read. */
  pinsReady: boolean | undefined;
  /**
   * This device has seen this user finish onboarding before. Used when the profile can't be
   * fetched (offline at launch) so an onboarded user is never locked out of SOS.
   */
  onboardedLocally: boolean | undefined;
};

export function resolveAppGate(f: GateFacts): AppGate {
  if (f.hasSession === undefined) return 'loading';
  if (!f.hasSession) return 'signedOut';
  if (f.pinsReady === undefined) return 'loading';
  if (f.profileStatus === 'pending') return f.onboardedLocally && f.pinsReady ? 'ready' : 'loading';
  if (f.profileStatus === 'error') {
    if (f.onboardedLocally === undefined) return 'loading';
    return f.onboardedLocally && f.pinsReady ? 'ready' : 'onboarding';
  }
  return f.onboardedAt && f.pinsReady ? 'ready' : 'onboarding';
}
