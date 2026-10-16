import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, type Tables } from '@/lib/supabase';

/**
 * Offline copy of who to alert. The SOS flow reads this when there's no internet, so it must be
 * refreshed after every change to contacts, the medical card or the user's name.
 */
export const SOS_RECIPIENTS_KEY = 'safesphere.cache.sosRecipients';

export type SosRecipientsCache = {
  contacts: { name: string; phone: string; is_primary: boolean }[];
  medical: Omit<Tables<'medical_cards'>, 'user_id' | 'updated_at'> | null;
  fullName: string;
  updatedAt: string;
};

/**
 * Re-reads contacts, medical card and name from Supabase and stores them on the device.
 * If the network call fails, the previous cache is kept (never overwritten with nothing).
 */
export async function cacheSosRecipients(): Promise<SosRecipientsCache | null> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return null;

  const [contacts, medical, profile] = await Promise.all([
    supabase
      .from('emergency_contacts')
      .select('name, phone, is_primary, position')
      .eq('user_id', userId)
      .order('position'),
    supabase
      .from('medical_cards')
      .select('blood_group, allergies, conditions, medications, notes')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
  ]);
  if (contacts.error || medical.error || profile.error) return null;

  const cache: SosRecipientsCache = {
    contacts: [...contacts.data]
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)
      .map(({ name, phone, is_primary }) => ({ name, phone, is_primary })),
    medical: medical.data ?? null,
    fullName: profile.data?.full_name ?? '',
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SOS_RECIPIENTS_KEY, JSON.stringify(cache));
  return cache;
}

export async function readSosRecipients(): Promise<SosRecipientsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(SOS_RECIPIENTS_KEY);
    return raw ? (JSON.parse(raw) as SosRecipientsCache) : null;
  } catch {
    return null;
  }
}
