import { Stack } from 'expo-router';

import { colors } from '@/theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
    </Stack>
  );
}
