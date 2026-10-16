import { PlaceholderPage } from '@/components/PlaceholderPage'

export function RiskMapPage() {
  return (
    <PlaceholderPage
      title="Risk map & zones"
      subtitle="Predicted risk by area and hour"
      planned={[
        'H3 risk heatmap per city with an hour-of-day slider (ML-1)',
        'Click a cell to see its score and SHAP reasons',
        'Draw and manage safe / unsafe zones',
      ]}
    />
  )
}
