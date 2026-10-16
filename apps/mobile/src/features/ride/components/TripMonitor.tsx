import { router } from 'expo-router';
import { Check, ChevronLeft, Share2, TriangleAlert } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ScalePressable, Text } from '@/components/ui';
import { RiskMap } from '@/features/map/components/RiskMap';
import { useCurrentPosition } from '@/features/map/hooks';
import type { PlannedRoute } from '@/features/map/services/mapApi';
import { useSos } from '@/features/sos';
import { colors, radius, shadows, spacing } from '@/theme';

import { endTrip, markTripOk, shareTrip } from '../services/tripEngine';
import type { ActiveTrip } from '../state/tripStore';

/** Current time, refreshed every minute (render must not read the clock directly). */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** Live view of an active Safe Ride / Safe Walk. */
export function TripMonitor({ trip }: { trip: ActiveTrip }) {
  const insets = useSafeAreaInsets();
  const { position } = useCurrentPosition();
  const sos = useSos();
  const now = useMinuteClock();

  // The user answered the "Are you OK?" check: log it as a false alarm (ML-5 feedback).
  useEffect(() => {
    if (trip.status === 'checking' && sos.phase === 'idle') void markTripOk();
  }, [trip.status, sos.phase]);

  const routes = useMemo<PlannedRoute[]>(
    () =>
      trip.routes.map((polyline, i) => ({
        label: i === 0 ? 'safest' : 'fastest',
        polyline,
        duration_s: 0,
        distance_m: 0,
        risk_exposure: 0,
      })),
    [trip.routes],
  );

  const ok = trip.status === 'monitoring';
  const minutesLeft = trip.expectedArrivalAt ? Math.max(0, Math.round((trip.expectedArrivalAt - now) / 60_000)) : null;

  const end = () =>
    Alert.alert(trip.mode === 'ride' ? 'End this ride?' : 'End this walk?', 'Monitoring stops for this trip.', [
      { text: 'Keep watching', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => void endTrip('completed') },
    ]);

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <RiskMap center={position ?? trip.destination} zoom={13} routes={routes} user={position} pin={trip.destination} />
        <ScalePressable
          style={[styles.back, { top: insets.top + spacing.md }]}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ChevronLeft size={24} color={colors.ink} strokeWidth={1.8} />
        </ScalePressable>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.status}>
          {ok ? (
            <Check size={18} color={colors.safeText} strokeWidth={2} />
          ) : (
            <TriangleAlert size={18} color={colors.dangerText} strokeWidth={2} />
          )}
          <Text variant="subhead" color={ok ? 'safeText' : 'dangerText'}>
            {ok ? (trip.routes.length ? 'On the expected route' : 'Monitoring your trip') : (trip.lastIssue ?? 'Checking on you')}
          </Text>
        </View>
        <Text variant="largeTitle">
          {trip.expectedArrivalAt ? `Arriving ${clock(trip.expectedArrivalAt)}` : 'On your way'}
        </Text>
        <Text variant="caption" color="ink3">
          {trip.destination.name}
          {minutesLeft != null ? ` · about ${minutesLeft} min` : ''}
        </Text>

        {trip.cab && (trip.cab.driverName || trip.cab.plate) ? (
          <Card style={styles.cab}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{trip.cab.driverName ?? 'Driver'}</Text>
              <Text variant="caption" color="ink3">
                {[trip.cab.vehicle, trip.cab.provider && `shared from ${trip.cab.provider}`].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {trip.cab.plate ? (
              <View style={styles.plate} accessibilityLabel={`Number plate ${trip.cab.plate}`}>
                <Text variant="footnote" style={styles.plateText}>
                  {trip.cab.plate}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        <Text variant="caption" color="ink3">
          We check the route, long stops, heading and timing. If something looks wrong you get 10 seconds to say
          you are OK before your contacts are alerted. If your phone goes silent for 5 minutes, the server alerts
          them.
        </Text>

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Share live trip" icon={Share2} onPress={() => void shareTrip(trip, position)} />
          </View>
          <Button label="End" variant="secondary" onPress={end} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  map: { height: '45%' },
  back: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  sheet: { flex: 1, marginTop: -radius.sheet, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: colors.ground },
  sheetContent: { padding: spacing.lg, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cab: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plate: { backgroundColor: '#FCD34D', borderWidth: 1.5, borderColor: colors.ink, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  plateText: { fontFamily: 'Figtree_800ExtraBold', letterSpacing: 0.6 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
