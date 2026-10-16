import { HeartPulse, Users } from 'lucide-react'
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui'
import { useEmergencyContacts, useMedicalCard } from '@/lib/queries'

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold tracking-[0.05em] text-ink-3 uppercase">{label}</dt>
      <dd className="m-0 text-[15px] whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

export function MedicalCardPanel({ userId }: { userId: string }) {
  const { data, isLoading } = useMedicalCard(userId)
  const empty =
    data && !data.blood_group && !data.allergies && !data.conditions && !data.medications && !data.notes

  return (
    <Card variant="panel" aria-labelledby="medical-title" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
      <h2 id="medical-title" className="m-0 text-[17px] font-extrabold">
        Medical card
      </h2>
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && (!data || empty) && (
        <EmptyState icon={HeartPulse} tone="neutral" title="No medical card on file." />
      )}
      {data && !empty && (
        <dl className="m-0 flex flex-col gap-3">
          {data.blood_group && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-bold tracking-[0.05em] text-ink-3 uppercase">Blood group</dt>
              <dd className="m-0 text-2xl font-extrabold">{data.blood_group}</dd>
            </div>
          )}
          <Field label="Allergies" value={data.allergies} />
          <Field label="Conditions" value={data.conditions} />
          <Field label="Medicines" value={data.medications} />
          <Field label="Notes" value={data.notes} />
        </dl>
      )}
    </Card>
  )
}

export function ContactsPanel({ userId }: { userId: string }) {
  const { data, isLoading } = useEmergencyContacts(userId)
  return (
    <Card variant="panel" aria-labelledby="contacts-title" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
      <h2 id="contacts-title" className="m-0 text-[17px] font-extrabold">
        Emergency contacts
      </h2>
      {isLoading && <Skeleton className="h-24" />}
      {data && data.length === 0 && <EmptyState icon={Users} tone="neutral" title="No contacts saved." />}
      {data && data.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {data.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-center gap-3 py-2.5 ${i < data.length - 1 ? 'border-b border-[#eef0f3]' : ''}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-sm font-extrabold">
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-[15px] font-bold">
                  {c.name}
                  {c.is_primary && <Badge tone="info">Primary</Badge>}
                </span>
                {c.relation && <span className="text-[13px] text-ink-3">{c.relation}</span>}
              </span>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="shrink-0 text-sm font-bold">
                {c.phone}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
