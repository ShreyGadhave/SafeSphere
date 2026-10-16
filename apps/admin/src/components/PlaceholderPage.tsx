import type { ReactNode } from 'react'
import { Card, PageHeader } from '@/components/ui'

type PlaceholderPageProps = {
  title: string
  subtitle: string
  /** What this page will hold once built; shown so reviewers know the plan. */
  planned: ReactNode[]
}

/** Shared shell for pages that are planned but not built yet (Phase 0). */
export function PlaceholderPage({ title, subtitle, planned }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card variant="panel" className="flex flex-col gap-3">
        <h2 className="m-0 text-[17px] font-extrabold">Coming in a later phase</h2>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-2">
          {planned.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>
    </>
  )
}
