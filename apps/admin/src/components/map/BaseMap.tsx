import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { cn } from '@/lib/cn'
import type { LngLat, MapLine, MapMarker } from '@/types'
import { MUMBAI_CENTER, OPENFREEMAP_STYLE } from './mapConfig'

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
    <div className={cn('relative h-full w-full', className)}>
      <div ref={containerRef} className="absolute inset-0" role="region" aria-label={label} />
      <style>{`
        .ss-marker-halo { animation: ss-halo 1.8s ease-out infinite; }
        @keyframes ss-halo { 0% { transform: scale(.6); opacity: .55 } 100% { transform: scale(2.6); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .ss-marker-halo { animation: none; opacity: 0 } }
      `}</style>
    </div>
  )
}
