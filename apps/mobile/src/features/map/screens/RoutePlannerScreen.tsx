import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, ScalePressable, Text, TextField } from '@/components/ui';
import { colors, fadeInUp, radius, shadows, spacing } from '@/theme';

import { MUMBAI, RiskMap } from '../components/RiskMap';
import { useCurrentPosition } from '../hooks';
import { type LatLng, type PlaceResult, type PlannedRoute, planRoutes, riskLevel, searchPlaces } from '../services/mapApi';

const LABEL: Record<PlannedRoute['label'], string> = {
  fastest: 'Fastest',
  balanced: 'Balanced',
  safest: 'Safest',
  custom: 'Route',
};
const LEVEL_COLOR = { low: 'safeText', medium: 'warningText', high: 'dangerText' } as const;

function formatDuration(s: number): string {
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** ML-2: pick a destination, compare fastest / balanced / safest routes and their risk exposure. */
export function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; name?: string }>();
  const { position } = useCurrentPosition();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'walk' | 'drive'>('walk');
  const [selected, setSelected] = useState(0);
  const [destination, setDestination] = useState<(LatLng & { name: string }) | null>(
    params.lat && params.lng
      ? { lat: Number(params.lat), lng: Number(params.lng), name: params.name ?? 'Selected point' }
      : null,
  );

  const debounced = useDebounced(query.trim(), 350);
  const results = useQuery({
    queryKey: ['placeSearch', debounced],
    queryFn: () => searchPlaces(debounced, position),
    enabled: debounced.length >= 3 && !destination,
  });

  const plan = useMutation({
    mutationFn: () => planRoutes(position as LatLng, destination as LatLng, mode),
    onSuccess: () => setSelected(0),
  });

  const routes = useMemo(() => plan.data ?? [], [plan.data]);
  const safestIndex = useMemo(
    () => routes.reduce((best, r, i) => (r.risk_exposure < routes[best].risk_exposure ? i : best), 0),
    [routes],
  );

  const pick = (p: PlaceResult) => {
    setDestination({ lat: p.lat, lng: p.lng, name: p.name });
    setQuery(p.name);
    plan.reset();
  };

  return (
    <View style={styles.root}>
      <RiskMap center={destination ?? position ?? MUMBAI} zoom={13} routes={routes} selectedRoute={selected} user={position} pin={destination} />

      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.searchRow}>
          <ScalePressable style={styles.back} accessibilityLabel="Back" onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.ink} strokeWidth={1.8} />
          </ScalePressable>
          <View style={styles.flex}>
            <TextField
              label="Where to?"
              placeholder="Search a place"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setDestination(null);
                plan.reset();
              }}
              autoCorrect={false}
            />
          </View>
        </View>

        {!destination && results.data?.length ? (
          <Card flush style={styles.results}>
            <FlatList
              data={results.data}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(p, i) => `${p.lat},${p.lng},${i}`}
              renderItem={({ item }) => (
                <Pressable style={styles.result} onPress={() => pick(item)} accessibilityRole="button">
                  <MapPin size={18} color={colors.ink3} strokeWidth={1.8} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text variant="caption" color="ink3" numberOfLines={1}>
                      {item.detail}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </Card>
        ) : null}
      </View>

      {destination ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modes}>
            <Chip label="Walk" selected={mode === 'walk'} onPress={() => (setMode('walk'), plan.reset())} />
            <Chip label="Drive" selected={mode === 'drive'} onPress={() => (setMode('drive'), plan.reset())} />
          </View>

          {routes.length ? (
            <View style={styles.routeList}>
              {routes.map((r, i) => {
                const level = riskLevel(r.risk_exposure);
                return (
                  <Animated.View key={r.label} entering={fadeInUp(i)}>
                    <ScalePressable
                      style={[styles.route, i === selected && styles.routeSelected]}
                      accessibilityLabel={`${LABEL[r.label]} route, ${formatDuration(r.duration_s)}, risk ${Math.round(r.risk_exposure)}`}
                      onPress={() => setSelected(i)}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">
                          {LABEL[r.label]}
                          {i === safestIndex && routes.length > 1 ? ' · lowest risk' : ''}
                        </Text>
                        <Text variant="caption" color="ink3">
                          {formatDuration(r.duration_s)} · {(r.distance_m / 1000).toFixed(1)} km
                        </Text>
                      </View>
                      <Text variant="footnote" color={LEVEL_COLOR[level]}>
                        Risk {Math.round(r.risk_exposure)}
                      </Text>
                    </ScalePressable>
                  </Animated.View>
                );
              })}
            </View>
          ) : null}

          {plan.error ? (
            <Text variant="footnote" color="dangerText">
              {plan.error.message}
            </Text>
          ) : null}
          {!position ? (
            <Text variant="footnote" color="ink3">
              Waiting for your location…
            </Text>
          ) : null}

          {routes.length ? (
            <Button
              label="Start Safe Walk on this route"
              onPress={() =>
                // Hand the destination over so Safe Walk doesn't ask for it again.
                router.push({
                  pathname: '/walk',
                  params: { lat: String(destination!.lat), lng: String(destination!.lng), name: destination!.name },
                })
              }
            />
          ) : (
            <Button
              label={plan.isPending ? 'Finding routes…' : 'Show safe routes'}
              disabled={!position || plan.isPending}
              onPress={() => plan.mutate()}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  top: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 0, gap: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  results: { maxHeight: 300 },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.floating,
  },
  modes: { flexDirection: 'row', gap: spacing.sm },
  routeList: { gap: spacing.sm },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.fill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeSelected: { borderColor: colors.ink, backgroundColor: colors.card },
});
