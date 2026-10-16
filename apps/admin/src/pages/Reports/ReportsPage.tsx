import { PlaceholderPage } from '@/components/PlaceholderPage'

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      subtitle="Community reports waiting for review"
      planned={[
        'Moderation queue with AI category, urgency and toxicity scores (ML-6)',
        'Duplicate groups merged by text similarity',
        'Approve, reject or recategorise; approved reports feed the risk model',
      ]}
    />
  )
}
