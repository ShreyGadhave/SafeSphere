import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/features/auth/hooks/useSession';
import { cacheSosRecipients } from '@/features/contacts/cache';
import { supabase, type Tables } from '@/lib/supabase';

import { profileKeys } from './useProfile';

export type MedicalCard = Tables<'medical_cards'>;
export type MedicalCardInput = Pick<MedicalCard, 'blood_group' | 'allergies' | 'conditions' | 'medications' | 'notes'>;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function useMedicalCard() {
  const user = useUser();
  return useQuery({
    queryKey: profileKeys.medicalCard(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<MedicalCard | null> => {
      const { data, error } = await supabase.from('medical_cards').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Empty strings are saved as null so the SOS text only mentions what the user filled in. */
function clean(input: MedicalCardInput): MedicalCardInput {
  const orNull = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    blood_group: orNull(input.blood_group),
    allergies: orNull(input.allergies),
    conditions: orNull(input.conditions),
    medications: orNull(input.medications),
    notes: orNull(input.notes),
  };
}

export function useSaveMedicalCard() {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MedicalCardInput): Promise<MedicalCard> => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('medical_cards')
        .upsert({ user_id: user.id, ...clean(input) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (card) => {
      queryClient.setQueryData(profileKeys.medicalCard(user?.id), card);
      void cacheSosRecipients();
    },
  });
}
