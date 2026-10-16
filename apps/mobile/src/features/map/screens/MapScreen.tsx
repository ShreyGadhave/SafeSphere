import type { CameraRef } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { Clock, LocateFixed, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, ScalePressable, Text } from '@/components/ui';
import { fetchNearbyReports } from '@/features/community/services/communityApi';
import { syncCabFromClipboard } from '@/features/ride/components/CabLinkCard';
import { colors, layout, radius, shadows, spacing } from '@/theme';

import { AreaCard } from '../components/AreaCard';
import { MUMBAI, RiskMap } from '../components/RiskMap';
import { useAreaRisk, useCurrentPosition, useRiskCells, useSafePlaces } from '../hooks';
import { type Bounds, type LatLng, slotFor } from '../services/mapApi';

/** Time-of-day presets for the heatmap ("what is this area like at night?"). */
const TIME_PRESETS: { label: string; hour: number | null }[] = [
  { label: 'Now', hour: null },
  { label: '9 PM', hour: 21 },
  { label: '1 AM', hour: 1 },
  { label: '8 AM', hour: 8 },
];

function initialBounds(c: LatLng): Bounds {
  return [c.lng - 0.06, c.lat - 0.05, c.lng + 0.06, c.lat + 0.05];
}

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraRef>(null);
  const { position } = useCurrentPosition();
  const [preset, setPreset] = useState(0);
  const [showRisk, setShowRisk] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const start = position ?? MUMBAI;
  const focus = pin ?? position;
  const slot = useMemo(() => slotFor(new Date(), TIME_PRESETS[preset].hour ?? undefined), [preset]);
  const slotLabel = TIME_PRESETS[preset].hour == null ? 'now' : TIME_PRESETS[preset].label;

  const cells = useRiskCells(showRisk ? (bounds ?? initialBounds(start)) : null, slot);
  const places = useSafePlaces(focus ?? start);
  const area = useAreaRisk(focus, slot);
  const nearestPolice = places.data?.find((p) => p.kind === 'police');
  const incidentsAt = focus ?? start;
  const incidents = useQuery({
    queryKey: ['mapIncidents', Math.round(incidentsAt.lat * 50), Math.round(incidentsAt.lng * 50)],
    queryFn: () => fetchNearbyReports(incidentsAt, 10_000),
    enabled: showIncidents,
    staleTime: 5 * 60_000,
  });

  const recenter = () => {
    if (!position) return;
    setPin(null);
    camera.current?.flyTo({ center: [position.lng, position.lat], zoom: 14, duration: 600 });
  };

  return (
    <View style={styles.root}>
      <RiskMap
        ref={camera}
        center={start}
        cells={showRisk ? cells.data : []}
        places={showPlaces ? places.data : []}
        incidents={showIncidents ? incidents.data : []}
        user={position}
        pin={pin}
        onPress={setPin}
        onBoundsChange={setBounds}
      />

      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]} pointerEvents="box-none">
        <Pressable
          style={styles.search}
          accessibilityRole="search"
          accessibilityLabel="Search a place and plan a safe route"
          onPress={() => router.push('/route-planner')}>
          <Search size={20} color={colors.ink3} strokeWidth={1.8} />
          <Text variant="body" color="ink3">
            Search a place
          </Text>
        </Pressable>
        <View style={styles.chips}>
          <Chip label="Risk" selected={showRisk} onPress={() => setShowRisk((v) => !v)} />
          <Chip label="Incidents" selected={showIncidents} onPress={() => setShowIncidents((v) => !v)} />
          <Chip label="Safe places" selected={showPlaces} onPress={() => setShowPlaces((v) => !v)} />
          <Chip label="Paste cab link" onPress={() => void syncCabFromClipboard()} />
          <ScalePressable
            style={styles.timeChip}
            accessibilityLabel={`Heatmap time: ${TIME_PRESETS[preset].label}. Tap to change`}
            onPress={() => setPreset((p) => (p + 1) % TIME_PRESETS.length)}>
            <Clock size={15} color={colors.ink} strokeWidth={1.8} />
            <Text variant="footnote">{TIME_PRESETS[preset].label}</Text>
          </ScalePressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: layout.tabBarHeight + spacing.md }]} pointerEvents="box-none">
        {position ? (
          <ScalePressable style={styles.locate} accessibilityLabel="Back to my location" onPress={recenter}>
            <LocateFixed size={22} color={colors.ink} strokeWidth={1.8} />
          </ScalePressable>
        ) : null}
        {focus ? (
          <AreaCard
            key={`${focus.lat},${focus.lng}`}
            point={focus}
            name={area.data?.name ?? 'This area'}
            cell={area.data?.cell ?? null}
            loading={area.isPending}
            slotLabel={slotLabel}
            nearestPolice={nearestPolice}
          />
        ) : (
          <View style={styles.hint}>
            <Text variant="footnote" color="ink2" align="center">
              Tap anywhere on the map to see how safe it is.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  top: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 0, gap: spacing.sm },
  search: {
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.floating,
  },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  timeChip: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  bottom: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0, gap: spacing.sm },
  locate: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  hint: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, ...shadows.card },
});
