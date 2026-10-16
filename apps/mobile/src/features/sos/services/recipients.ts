/**
 * Who gets the SOS. Contacts must be available with no internet, so they are cached on the
 * device (written by onboarding/contacts screens and refreshed here whenever we're online).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

import { STORAGE_KEYS } from '../constants';
import type { MedicalSummary } from './message';

export type SosContact = { name: string; phone: string; is_primary: boolean };

export type SosRecipients = {
  contacts: SosContact[];
  medical: MedicalSummary | null;
  fullName: string;
  updatedAt: string;
};

export const EMPTY_RECIPIENTS: SosRecipients = { contacts: [], medical: null, fullName: '', updatedAt: '' };

export async function readCachedRecipients(): Promise<SosRecipients> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recipients);
    if (!raw) return EMPTY_RECIPIENTS;
    const parsed = JSON.parse(raw) as Partial<SosRecipients>;
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts.filter((c) => c?.phone) : [],
      medical: parsed.medical ?? null,
      fullName: parsed.fullName ?? '',
      updatedAt: parsed.updatedAt ?? '',
    };
  } catch {
    return EMPTY_RECIPIENTS;
  }
}

/** Primary contact first, then the rest in the user's order. */
export function orderContacts(contacts: SosContact[]): SosContact[] {
  return [...contacts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
}

/**
 * Pulls contacts, medical card and name from Supabase and updates the cache.
 * Returns the cached copy unchanged when offline or signed out.
 */
export async function refreshSosRecipients(): Promise<SosRecipients> {
  const cached = await readCachedRecipients();
  try {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) return cached;

    const [contacts, medical, profile] = await Promise.all([
      supabase
        .from('emergency_contacts')
        .select('name, phone, is_primary, position')
        .eq('user_id', userId)
        .order('position', { ascending: true }),
      supabase
        .from('medical_cards')
        .select('blood_group, allergies, conditions, medications')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    ]);
    if (contacts.error || medical.error || profile.error) return cached;

    const next: SosRecipients = {
      contacts: (contacts.data ?? []).map(({ name, phone, is_primary }) => ({ name, phone, is_primary })),
      medical: medical.data ?? null,
      fullName: profile.data?.full_name ?? cached.fullName,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.recipients, JSON.stringify(next));
    return next;
  } catch {
    return cached;
  }
}
