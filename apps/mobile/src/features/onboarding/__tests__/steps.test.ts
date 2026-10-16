import { nextStep, previousStep, resolveAppGate, resolveOnboardingStep, type GateFacts } from '../steps';

const profile = { full_name: 'Aisha Khan', phone: '+919876543210', city: 'mumbai' };

describe('resolveOnboardingStep', () => {
  const done = { welcomeSeen: true, profile, contactCount: 2, pinsSet: true };

  it('resumes at the first unfinished step', () => {
    expect(resolveOnboardingStep({ ...done, welcomeSeen: false })).toBe('welcome');
    expect(resolveOnboardingStep({ ...done, profile: { ...profile, city: null } })).toBe('profile');
    expect(resolveOnboardingStep({ ...done, profile: { ...profile, full_name: '  ' } })).toBe('profile');
    expect(resolveOnboardingStep({ ...done, profile: null })).toBe('profile');
    expect(resolveOnboardingStep({ ...done, contactCount: 0 })).toBe('contacts');
    expect(resolveOnboardingStep({ ...done, pinsSet: false })).toBe('pins');
    expect(resolveOnboardingStep(done)).toBe('permissions');
  });

  it('sends returning users straight to the PIN step', () => {
    // Signed out and back in: welcome flag wiped, PINs wiped, profile and contacts on the server.
    const returning = { welcomeSeen: false, profile, contactCount: 2, pinsSet: false, onboardedAt: '2026-10-16T10:00:00Z' };
    expect(resolveOnboardingStep(returning)).toBe('pins');
  });

  it('walks the steps in order', () => {
    expect(nextStep('welcome')).toBe('profile');
    expect(nextStep('permissions')).toBeNull();
    expect(previousStep('contacts')).toBe('profile');
    expect(previousStep('welcome')).toBeNull();
  });
});

describe('resolveAppGate', () => {
  const ready: GateFacts = {
    hasSession: true,
    profileStatus: 'success',
    onboardedAt: '2026-10-16T10:00:00Z',
    pinsReady: true,
    onboardedLocally: true,
  };

  it('waits for the session and PINs', () => {
    expect(resolveAppGate({ ...ready, hasSession: undefined })).toBe('loading');
    expect(resolveAppGate({ ...ready, pinsReady: undefined })).toBe('loading');
  });

  it('routes signed-out users to auth', () => {
    expect(resolveAppGate({ ...ready, hasSession: false })).toBe('signedOut');
  });

  it('requires onboarding until it is finished and PINs exist on this device', () => {
    expect(resolveAppGate({ ...ready, onboardedAt: null })).toBe('onboarding');
    expect(resolveAppGate({ ...ready, pinsReady: false })).toBe('onboarding');
    expect(resolveAppGate(ready)).toBe('ready');
  });

  it('never locks an onboarded user out of SOS when the profile cannot load offline', () => {
    expect(resolveAppGate({ ...ready, profileStatus: 'error', onboardedAt: undefined })).toBe('ready');
    expect(resolveAppGate({ ...ready, profileStatus: 'pending', onboardedAt: undefined })).toBe('ready');
    expect(
      resolveAppGate({ ...ready, profileStatus: 'error', onboardedAt: undefined, onboardedLocally: false }),
    ).toBe('onboarding');
    expect(
      resolveAppGate({ ...ready, profileStatus: 'pending', onboardedAt: undefined, onboardedLocally: false }),
    ).toBe('loading');
  });
});
