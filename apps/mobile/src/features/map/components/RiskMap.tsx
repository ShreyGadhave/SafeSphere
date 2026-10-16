import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map as MapView,
  Marker,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useMemo } from 'react';
import { type NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import type { Bounds, LatLng, PlannedRoute, RiskCell, SafePlace } from '../services/mapApi';

/** Free light basemap from OpenFreeMap (OSM data, no key). */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
export const MUMBAI: LatLng = { lat: 19.076, lng: 72.8777 };

type RiskMapProps = {
  center: LatLng;
  zoom?: number;
  cells?: RiskCell[];
  places?: SafePlace[];
  routes?: PlannedRoute[];
  selectedRoute?: number;
  user?: LatLng | null;
  pin?: LatLng | null;
  onPress?: (point: LatLng) => void;
  onBoundsChange?: (bounds: Bounds) => void;
};

const ROUTE_COLOR = { fastest: colors.iconMuted, balanced: colors.warning, safest: colors.info, custom: colors.info };

/** Map with the ML-1 risk heatmap, OSM safe places, ML-2 routes and the user's position. */
export const RiskMap = forwardRef<CameraRef, RiskMapProps>(function RiskMap(
  { center, zoom = 13, cells, places, routes, selectedRoute = 0, user, pin, onPress, onBoundsChange },
  cameraRef,
) {
  const heat = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (cells ?? []).map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: { score: c.score },
      })),
    }),
    [cells],
  );

  const placesFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (places ?? [])
        .filter((p) => p.kind === 'police' || p.kind === 'hospital')
        .map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { kind: p.kind },
        })),
    }),
    [places],
  );

  const routesFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      // Selected route last so it draws on top.
      features: (routes ?? [])
        .map((r, i) => ({ r, i }))
        .sort((a, b) => Number(a.i === selectedRoute) - Number(b.i === selectedRoute))
        .map(({ r, i }) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: r.polyline.map((p) => [p.lng, p.lat]) },
          properties: { color: ROUTE_COLOR[r.label], selected: i === selectedRoute },
        })),
    }),
    [routes, selectedRoute],
  );

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE}
      logo={false}
      compass={false}
      attribution
      onPress={(e) => {
        const [lng, lat] = e.nativeEvent.lngLat;
        onPress?.({ lat, lng });
      }}
      onRegionDidChange={(e: NativeSyntheticEvent<ViewStateChangeEvent>) => onBoundsChange?.(e.nativeEvent.bounds)}>
      <Camera ref={cameraRef} initialViewState={{ center: [center.lng, center.lat], zoom }} />

      <GeoJSONSource id="risk" data={heat}>
        <Layer
          id="risk-heat"
          type="heatmap"
          paint={{
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 50, 0.12, 75, 0.55, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 1.3],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 13, 28, 16, 70],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(18,162,107,0)',
              0.2, 'rgba(18,162,107,0.22)',
              0.45, 'rgba(224,138,0,0.32)',
              0.75, 'rgba(217,45,58,0.42)',
              1, 'rgba(217,45,58,0.58)',
            ],
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="routes" data={routesFc}>
        <Layer
          id="routes-casing"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{ 'line-color': '#FFFFFF', 'line-width': ['case', ['get', 'selected'], 10, 6] }}
        />
        <Layer
          id="routes-line"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'selected'], 6, 3],
            'line-opacity': ['case', ['get', 'selected'], 1, 0.6],
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="places" data={placesFc}>
        <Layer
          id="places-dot"
          type="circle"
          paint={{
            'circle-radius': 7,
            'circle-color': colors.info,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,
          }}
        />
      </GeoJSONSource>

      {user ? (
        <Marker id="me" lngLat={[user.lng, user.lat]} anchor="center">
          <View style={styles.userDot} accessibilityLabel="Your location" />
        </Marker>
      ) : null}
      {pin ? (
        <Marker id="pin" lngLat={[pin.lng, pin.lat]} anchor="center">
          <View style={styles.pin} accessibilityLabel="Selected point" />
        </Marker>
      ) : null}
    </MapView>
  );
});

const styles = StyleSheet.create({
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.info,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
});
