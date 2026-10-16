import { PlaceholderPage } from '@/components/PlaceholderPage'

export function ModelsPage() {
  return (
    <PlaceholderPage
      title="AI models"
      subtitle="Versions and quality of every model in SafeSphere"
      planned={[
        'Active version and metrics per model (risk, route, audio, motion, anomaly, NLP, triage)',
        'False-alarm rate from user check-in feedback',
        'Groq usage against the free-tier limits',
      ]}
    />
  )
}
