import { PlaceholderPage } from '@/components/PlaceholderPage'

export function TripsPage() {
  return (
    <PlaceholderPage
      title="Safe Ride trips"
      subtitle="Every ride and walk being monitored right now"
      planned={[
        'Live list of active trips with driver, plate and ETA',
        'Route vs. actual path on the map, with anomaly markers',
        'Anomaly history and user check-in responses (feeds ML-5 retraining)',
      ]}
    />
  )
}
