import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl'
import { cn } from '@/lib/cn'
import type { LngLat, MapMarker } from '@/types'
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

/**
 * MapLibre map with OpenFreeMap tiles. Markers are rebuilt whenever the list
 * changes; the map instance itself is created once per mount.
 */
export function BaseMap({ center = MUMBAI_CENTER, zoom = 11, markers = [], className, label }: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRefs = useRef<Marker[]>([])
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
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    mapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom })
  }, [center.lng, center.lat, zoom])

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
