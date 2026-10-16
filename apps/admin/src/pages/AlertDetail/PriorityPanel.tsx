import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui'
import { useAlertSummary } from '@/lib/queries'
import type { LiveAlert } from '@/types'

const FACTOR_LABEL: Record<string, string> = {
  type: 'Emergency type',
  trigger: 'How it was raised',
  ai_confidence: 'AI model confidence',
  area_risk: 'Area risk at that hour',
  night: 'Night time',
  low_battery: 'Low battery',
  duress: 'Duress PIN used',
}

type Breakdown = { score?: number; parts?: Record<string, number>; area_risk?: number | null }

/** ML-8: why this alert has its priority, plus the Groq one-line summary (H2/H4). */
export function PriorityPanel({ alert }: { alert: LiveAlert }) {
  const summary = useAlertSummary(alert)
  const text = alert.ai_summary ?? summary.data
  const breakdown = (alert.priority_breakdown ?? {}) as Breakdown
  const factors = Object.entries(breakdown.parts ?? {})
    .filter(([k, v]) => k !== 'bias' && v > 0)
    .sort((a, b) => b[1] - a[1])
  const max = Math.max(0.01, ...factors.map(([, v]) => v))

  return (
    <Card variant="panel" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[17px] font-extrabold">Why this priority</h2>
        {alert.priority_score != null && (
          <span className="text-sm text-ink-3">
            Triage score <strong className="text-ink">{alert.priority_score}</strong> / 100
          </span>
        )}
      </div>

      {text ? (
        <p className="m-0 flex items-start gap-2 rounded-tile bg-info-soft p-3 text-sm leading-snug text-ink">
          <Sparkles aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-info" />
          <span>
            {text}
            <span className="sr-only"> (AI summary)</span>
          </span>
        </p>
      ) : summary.isFetching ? (
        <p className="m-0 text-sm text-ink-3">Writing a summary…</p>
      ) : null}

      {factors.length > 0 ? (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Contribution of each factor to the triage score</caption>
          <tbody>
            {factors.map(([key, value]) => (
              <tr key={key} title={`${FACTOR_LABEL[key] ?? key}: +${value.toFixed(2)}`}>
                <th scope="row" className="w-44 py-1.5 pr-3 text-left font-semibold text-ink-2">
                  {FACTOR_LABEL[key] ?? key}
                </th>
                <td className="py-1.5">
                  <div className="h-2 rounded-full bg-subtle">
                    <div className="h-2 rounded-full bg-info" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                </td>
                <td className="w-14 py-1.5 pl-3 text-right font-bold tabular-nums">+{value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="m-0 text-sm text-ink-3">No triage breakdown for this alert.</p>
      )}
      <p className="m-0 text-xs text-ink-3">
        Score = 100 × sigmoid(sum of factors − 2). Weights are documented and identical for every alert.
      </p>
    </Card>
  )
}
