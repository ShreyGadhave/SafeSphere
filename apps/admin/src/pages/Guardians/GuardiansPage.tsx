import { PlaceholderPage } from '@/components/PlaceholderPage'

export function GuardiansPage() {
  return (
    <PlaceholderPage
      title="Guardians"
      subtitle="Volunteers who respond to nearby SOS alerts"
      planned={[
        'Verification queue for new guardian sign-ups',
        'Response history and average arrival time',
        'Suspend or remove guardians',
      ]}
    />
  )
}
