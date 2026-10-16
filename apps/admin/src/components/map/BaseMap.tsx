import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource } from './maplibre'
import type { FeatureCollection } from 'geojson'
import { cn } from '@/lib/cn'
import type { LngLat, MapLine, MapMarker } from '@/types'
import { MUMBAI_CENTER, OPENFREEMAP_STYLE, RISK_BANDS } from './mapConfig'

const markerColors: Record<MapMarker['tone'], string> = {
  danger: '#D92D3A',
  warning: '#E08A00',
  neutral: '#0E1726',
  info: '#2563EB',
}

type BaseMapProps = {
  center?: LngLat
  zoom?: number
  markers?: MapMarker[]
  /** Polylines (e.g. a live-location trail), drawn under the markers. */
  lines?: MapLine[]
  /** Points to fit in view. Refitted whenever `fitKey` changes, not on every update. */
  fitTo?: LngLat[]
  fitKey?: string
  /** Hide the zoom buttons (small embedded maps). */
  interactive?: boolean
  className?: string
  /** Accessible description of what the map shows. */
  label: string
  /** Risk heatmap points (ML-1); weight 0-1. */
  heat?: { lng: number; lat: number; weight: number }[]
  /** Risk cells (ML-1 hexagons) coloured by score 0-100; `selectedCellId` gets an outline. */
  cells?: { id: string; ring: LngLat[]; score: number }[]
  selectedCellId?: string | null
  /** Filled polygons (zones), coloured per item. */
  polygons?: { id: string; ring: LngLat[]; color: string }[]
  /** Called with the clicked position. */
  onMapClick?: (point: LngLat) => void
}

function createMarkerElement(marker: MapMarker): HTMLElement {
  const color = markerColors[marker.tone]
  const size = marker.tone === 'info' ? 12 : 20
  const root = document.createElement('div')
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', marker.label)
  root.title = marker.label
  root.style.cssText = `position:relative;width:${size}px;height:${size}px`

  if (marker.pulse) {
    const halo = document.createElement('span')
    halo.className = 'ss-marker-halo'
    halo.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:${color}`
    root.appendChild(halo)
  }

  const dot = document.createElement('span')
  dot.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:${color};border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25)`
  root.appendChild(dot)
  return root
}

const LINE_SOURCE = 'ss-lines'
const HEAT_SOURCE = 'ss-heat'
const CELL_SOURCE = 'ss-cells'

const ZONE_SOURCE = 'ss-zones'

function linesToGeoJson(lines: MapLine[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines
      .filter((l) => l.coordinates.length >= 2)
      .map((l) => ({
        type: 'Feature',
        properties: { id: l.id, color: l.color ?? '#D92D3A' },
        geometry: { type: 'LineString', coordinates: l.coordinates.map((p) => [p.lng, p.lat]) },
      })),
  }
}

/**
 * MapLibre map with OpenFreeMap tiles (free, no key). The map instance is created once per mount;
 * markers and lines are synced when their props change.
 */
export function BaseMap({
  center = MUMBAI_CENTER,
  zoom = 11,
  markers = [],
  lines = [],
  fitTo,
  fitKey,
  interactive = true,
  className,
  label,
  heat,
  cells,
  selectedCellId,
  polygons,
  onMapClick,
}: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRefs = useRef<Marker[]>([])
  const [styleReady, setStyleReady] = useState(false)
  // Center/zoom here are the initial view only; later changes go through jumpTo below.
  const initialView = useRef({ center, zoom })

  useEffect(() => {
    if (!containerRef.current) return
    const { center: start, zoom: startZoom } = initialView.current
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [start.lng, start.lat],
      zoom: startZoom,
      attributionControl: { compact: true },
    })
    if (interactive) map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }
      map.addSource(HEAT_SOURCE, { type: 'geojson', data: empty })
      map.addLayer({
        id: HEAT_SOURCE,
        type: 'heatmap',
        source: HEAT_SOURCE,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 0.5, 0.12, 0.75, 0.55, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 14, 1.3],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 8, 12, 24, 15, 60],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(18,162,107,0)', 0.2, 'rgba(18,162,107,0.22)', 0.45, 'rgba(224,138,0,0.32)',
            0.75, 'rgba(217,45,58,0.42)', 1, 'rgba(217,45,58,0.58)',
          ],
        },
      })
      map.addSource(CELL_SOURCE, { type: 'geojson', data: empty })
      map.addLayer({
        id: `${CELL_SOURCE}-fill`,
        type: 'fill',
        source: CELL_SOURCE,
        paint: {
          'fill-color': ['step', ['get', 'score'], RISK_BANDS[0].color, 45, RISK_BANDS[1].color, 75, RISK_BANDS[2].color],
          // Darker within a band as the score rises, so 76 and 99 are still distinguishable.
          'fill-opacity': ['interpolate', ['linear'], ['get', 'score'], 0, 0.12, 44, 0.3, 45, 0.3, 74, 0.5, 75, 0.45, 100, 0.72],
        },
      })
      map.addLayer({
        id: `${CELL_SOURCE}-line`,
        type: 'line',
        source: CELL_SOURCE,
        paint: { 'line-color': '#ffffff', 'line-width': 0.6, 'line-opacity': 0.7 },
      })
      map.addLayer({
        id: `${CELL_SOURCE}-selected`,
        type: 'line',
        source: CELL_SOURCE,
        filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': '#0E1726', 'line-width': 3 },
      })
      map.addSource(ZONE_SOURCE, { type: 'geojson', data: empty })
      map.addLayer({ id: `${ZONE_SOURCE}-fill`, type: 'fill', source: ZONE_SOURCE, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 } })
      map.addLayer({ id: `${ZONE_SOURCE}-line`, type: 'line', source: ZONE_SOURCE, paint: { 'line-color': ['get', 'color'], 'line-width': 2 } })
      map.addSource(LINE_SOURCE, { type: 'geojson', data: linesToGeoJson([]) })
      map.addLayer({
        id: `${LINE_SOURCE}-casing`,
        type: 'line',
        source: LINE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 7 },
      })
      map.addLayer({
        id: LINE_SOURCE,
        type: 'line',
        source: LINE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4 },
      })
      setStyleReady(true)
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    if (fitKey !== undefined) return // the fit effect owns the camera
    mapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom })
  }, [center.lng, center.lat, zoom, fitKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRefs.current.forEach((m) => m.remove())
    markerRefs.current = markers.map((marker) =>
      new Marker({ element: createMarkerElement(marker) })
        .setLngLat([marker.position.lng, marker.position.lat])
        .addTo(map),
    )
  }, [markers])

  useEffect(() => {
    if (!styleReady) return
    const source = mapRef.current?.getSource(LINE_SOURCE) as GeoJSONSource | undefined
    source?.setData(linesToGeoJson(lines))
  }, [lines, styleReady])

  useEffect(() => {
    if (!styleReady) return
    const source = mapRef.current?.getSource(HEAT_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: (heat ?? []).map((h) => ({
        type: 'Feature',
        properties: { weight: h.weight },
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      })),
    })
  }, [heat, styleReady])

  useEffect(() => {
    if (!styleReady) return
    const source = mapRef.current?.getSource(CELL_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: (cells ?? []).map((c) => ({
        type: 'Feature',
        properties: { id: c.id, score: c.score },
        geometry: { type: 'Polygon', coordinates: [[...c.ring, c.ring[0]].map((p) => [p.lng, p.lat])] },
      })),
    })
  }, [cells, styleReady])

  useEffect(() => {
    if (!styleReady) return
    mapRef.current?.setFilter(`${CELL_SOURCE}-selected`, ['==', ['get', 'id'], selectedCellId ?? ''])
  }, [selectedCellId, styleReady])

  useEffect(() => {
    if (!styleReady) return
    const source = mapRef.current?.getSource(ZONE_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: (polygons ?? []).map((z) => ({
        type: 'Feature',
        properties: { id: z.id, color: z.color },
        geometry: { type: 'Polygon', coordinates: [z.ring.map((p) => [p.lng, p.lat])] },
      })),
    })
  }, [polygons, styleReady])

  // Latest click handler without re-creating the map.
  const clickRef = useRef(onMapClick)
  useEffect(() => {
    clickRef.current = onMapClick
  })
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handler = (e: { lngLat: { lng: number; lat: number } }) => clickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [])

  // Refit only when fitKey changes, so a live trail doesn't fight the user's panning.
  const fitPoints = useRef(fitTo)
  useEffect(() => {
    fitPoints.current = fitTo
  })
  useEffect(() => {
    const map = mapRef.current
    const points = fitPoints.current
    if (!map || fitKey === undefined || !points || points.length === 0) return
    if (points.length === 1) {
      map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: Math.max(map.getZoom(), 15) })
      return
    }
    const bounds = new LngLatBounds()
    points.forEach((p) => bounds.extend([p.lng, p.lat]))
    map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 })
  }, [fitKey])

  return (
    // min-h-[inherit]: panels often set only a min-height, and height:100% of that resolves to 0.
    <div className={cn('relative h-full min-h-[inherit] w-full', className)}>
      {/* !absolute: maplibre-gl.css sets .maplibregl-map { position: relative }, which would win. */}
      <div ref={containerRef} className="!absolute inset-0" role="region" aria-label={label} />
      <style>{`
        .ss-marker-halo { animation: ss-halo 1.8s ease-out infinite; }
        @keyframes ss-halo { 0% { transform: scale(.6); opacity: .55 } 100% { transform: scale(2.6); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .ss-marker-halo { animation: none; opacity: 0 } }
      `}</style>
    </div>
  )
}
