import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/features/auth/hooks/useSession';
import { cacheSosRecipients } from '@/features/contacts/cache';
import { supabase, type Database, type Tables } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;
export type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'full_name' | 'phone' | 'city' | 'onboarded_at'
>;

export const profileKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  medicalCard: (userId: string | undefined) => ['medicalCard', userId] as const,
};

export function useProfile() {
  const user = useUser();
  return useQuery({
    queryKey: profileKeys.profile(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<Profile> => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile, patch) => {
      queryClient.setQueryData(profileKeys.profile(user?.id), profile);
      if (patch.full_name !== undefined) void cacheSosRecipients();
    },
  });
}
