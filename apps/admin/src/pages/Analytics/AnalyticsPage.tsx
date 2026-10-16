import { PlaceholderPage } from '@/components/PlaceholderPage'

export function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Analytics"
      subtitle="Trends across cities, categories and time"
      planned={[
        'Incidents by city, category and hour of day',
        'Hotspot clusters over time',
        'Alert response times and outcomes',
      ]}
    />
  )
}
