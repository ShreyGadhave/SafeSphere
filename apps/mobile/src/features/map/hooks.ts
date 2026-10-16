import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import {
  areaRisk,
  type Bounds,
  fetchRiskCells,
  fetchSafePlaces,
  type LatLng,
  placeName,
  type TimeSlot,
} from './services/mapApi';

/** Rounds bounds so small pans reuse the cached heatmap instead of refetching. */
function roundBounds(b: Bounds): Bounds {
  const step = 0.02;
  return [
    Math.floor(b[0] / step) * step,
    Math.floor(b[1] / step) * step,
    Math.ceil(b[2] / step) * step,
    Math.ceil(b[3] / step) * step,
  ];
}

export function useRiskCells(bounds: Bounds | null, slot: TimeSlot) {
  const key = bounds ? roundBounds(bounds) : null;
  return useQuery({
    queryKey: ['riskCells', key, slot.hour, slot.dayType],
    queryFn: () => fetchRiskCells(key as Bounds, slot),
    enabled: key != null,
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAreaRisk(point: LatLng | null, slot: TimeSlot) {
  const lat = point ? Math.round(point.lat * 1000) / 1000 : null;
  const lng = point ? Math.round(point.lng * 1000) / 1000 : null;
  return useQuery({
    queryKey: ['areaRisk', lat, lng, slot.hour, slot.dayType],
    queryFn: async () => {
      const p = { lat: lat as number, lng: lng as number };
      const [cell, name] = await Promise.all([areaRisk(p, slot), placeName(p)]);
      return { cell, name };
    },
    enabled: lat != null && lng != null,
    staleTime: 10 * 60_000,
  });
}

export function useSafePlaces(point: LatLng | null) {
  const lat = point ? Math.round(point.lat * 100) / 100 : null;
  const lng = point ? Math.round(point.lng * 100) / 100 : null;
  return useQuery({
    queryKey: ['safePlaces', lat, lng],
    queryFn: () => fetchSafePlaces({ lat: lat as number, lng: lng as number }),
    enabled: lat != null && lng != null,
    staleTime: 60 * 60_000,
  });
}

/** Foreground position for the map and the Home risk card (no background tracking here). */
export function useCurrentPosition(): { position: LatLng | null; denied: boolean } {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setDenied(true);
        return;
      }
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last && !cancelled) setPosition({ lat: last.coords.latitude, lng: last.coords.longitude });
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 15_000 },
        (loc) => setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
      if (cancelled) sub.remove();
    })().catch(() => setDenied(true));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { position, denied };
}
