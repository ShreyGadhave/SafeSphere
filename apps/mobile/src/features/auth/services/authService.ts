import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthError } from '@supabase/supabase-js';

import { clearPins } from '@/lib/pin';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { unregisterPushToken } from '@/features/notifications/push';

import { refreshPinsReady } from '../pinsState';

export type SignUpInput = { fullName: string; email: string; password: string; phone: string };

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Turns Supabase auth errors into short, calm messages people can act on. */
export function friendlyAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'That email and password don’t match. Try again.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.';
  if (msg.includes('user already registered') || msg.includes('already been registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (msg.includes('password should be') || msg.includes('weak password'))
    return `Use a stronger password — at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts. Wait a minute and try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'No connection. Check your internet and try again.';
  return error.message;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendlyAuthError(error));
}

/**
 * Creates the account. `full_name` and `phone` go into user metadata, which the database trigger
 * copies into `profiles`. Returns whether a session started (false when email confirmation is on).
 */
export async function signUp({ fullName, email, password, phone }: SignUpInput): Promise<{ signedIn: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim(), phone } },
  });
  if (error) throw new Error(friendlyAuthError(error));
  return { signedIn: data.session != null };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new Error(friendlyAuthError(error));
}

/**
 * Signs out and removes everything personal from this device: cached queries, the offline SOS
 * recipients cache and the safety PINs (the next person to sign in sets their own).
 */
export async function signOut(): Promise<void> {
  // Needs the session (RLS), so remove this device's push token before signing out.
  await unregisterPushToken();
  await supabase.auth.signOut();
  queryClient.clear();
  await Promise.all([
    clearPins(),
    AsyncStorage.multiRemove(['safesphere.cache.sosRecipients', 'safesphere.onboarding.welcomeSeen']),
  ]);
  await refreshPinsReady();
}
