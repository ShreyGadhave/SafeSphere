import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/features/auth/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';

import { cacheSosRecipients } from '../cache';
import { normalizePhone } from '../phone';
import { MAX_CONTACTS, nextPrimaryAfterDelete, sortContacts, type ContactDraft } from '../rules';

export type EmergencyContact = Tables<'emergency_contacts'>;

export const contactKeys = {
  all: (userId: string | undefined) => ['emergencyContacts', userId] as const,
};

export function useContacts() {
  const user = useUser();
  return useQuery({
    queryKey: contactKeys.all(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<EmergencyContact[]> => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user!.id)
        .order('position');
      if (error) throw error;
      return sortContacts(data);
    },
  });
}

/**
 * Only one primary contact is allowed (unique index), so switching primary clears the old one first.
 */
async function makePrimary(userId: string, contactId: string) {
  const clear = await supabase
    .from('emergency_contacts')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true)
    .neq('id', contactId);
  if (clear.error) throw clear.error;
  const set = await supabase.from('emergency_contacts').update({ is_primary: true }).eq('id', contactId);
  if (set.error) throw set.error;
}

function useInvalidateContacts() {
  const user = useUser();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: contactKeys.all(user?.id) });
    void cacheSosRecipients();
  };
}

export type SaveContactInput = ContactDraft & { id?: string; isPrimary?: boolean };

/** Adds or edits a contact. The first contact a user adds always becomes primary. */
export function useSaveContact() {
  const user = useUser();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContacts();

  return useMutation({
    mutationFn: async ({ id, name, phone, relation, isPrimary }: SaveContactInput) => {
      if (!user) throw new Error('Not signed in');
      const normalized = normalizePhone(phone);
      if (!normalized) throw new Error('Enter a valid phone number.');
      const existing = queryClient.getQueryData<EmergencyContact[]>(contactKeys.all(user.id)) ?? [];
      const fields = { name: name.trim(), phone: normalized, relation: relation?.trim() || null };

      let contactId = id;
      if (id) {
        const { error } = await supabase.from('emergency_contacts').update(fields).eq('id', id);
        if (error) throw error;
      } else {
        if (existing.length >= MAX_CONTACTS) {
          throw new Error(`You can have up to ${MAX_CONTACTS} emergency contacts.`);
        }
        const position = existing.reduce((max, c) => Math.max(max, c.position + 1), 0);
        const { data, error } = await supabase
          .from('emergency_contacts')
          .insert({ ...fields, user_id: user.id, position, is_primary: existing.length === 0 })
          .select('id')
          .single();
        if (error) throw new Error(error.message.includes('maximum of 5') ? `You can have up to ${MAX_CONTACTS} emergency contacts.` : error.message);
        contactId = data.id;
      }
      if (isPrimary && contactId && existing.length > 0) await makePrimary(user.id, contactId);
    },
    onSuccess: invalidate,
  });
}

export function useSetPrimaryContact() {
  const user = useUser();
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!user) throw new Error('Not signed in');
      await makePrimary(user.id, contactId);
    },
    onSuccess: invalidate,
  });
}

/** Deletes a contact; if it was primary, the next contact becomes primary. */
export function useDeleteContact() {
  const user = useUser();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!user) throw new Error('Not signed in');
      const existing = queryClient.getQueryData<EmergencyContact[]>(contactKeys.all(user.id)) ?? [];
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId);
      if (error) throw error;
      const promote = nextPrimaryAfterDelete(existing, contactId);
      if (promote) await makePrimary(user.id, promote);
    },
    onSuccess: invalidate,
  });
}
