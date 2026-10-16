import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Registers background TaskManager tasks; must load before any UI so Android can wake them.
import '@/features/sos/tasks';

import { AuthProvider, useUser } from '@/features/auth';
import { usePushRegistration } from '@/features/notifications/push';
import { useAppGate } from '@/features/onboarding';
import { DetectionProvider } from '@/features/detection';
import { SosProvider } from '@/features/sos';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView style={styles.root}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <SosProvider>
              <DetectionProvider>
                <RootNavigator />
              </DetectionProvider>
            </SosProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Auth gate: signed-out users only reach (auth); signed-in users who haven't finished setup
 * (profile, contacts, PINs, permissions) only reach onboarding; everyone else gets the app.
 * The splash screen stays up until fonts, the session and the profile are known.
 */
function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const gate = useAppGate();
  const user = useUser();
  usePushRegistration(gate === 'ready' ? (user?.id ?? null) : null);
  const ready = (fontsLoaded || !!fontError) && gate !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={gate === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sos-active" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="ride/alert" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="fake-call" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="ride/index" />
        <Stack.Screen name="walk/index" />
        <Stack.Screen name="report/new" />
        <Stack.Screen name="route-planner" />
      </Stack.Protected>
      <Stack.Protected guard={gate === 'onboarding'}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={gate === 'signedOut'}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
