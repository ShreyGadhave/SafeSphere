import { motion } from 'motion/react'
import { Badge, Card, ErrorState, PageHeader, Skeleton, StatTile } from '@/components/ui'
import { errorMessage } from '@/lib/errors'
import { fadeUp, stagger } from '@/lib/motion'
import { type ModelEntry, useModels } from '@/lib/queries'

const TITLE: Record<string, string> = {
  risk: 'ML-1 · Area risk',
  audio: 'ML-3 · Scream detection',
  motion: 'ML-4 · Fall detection',
  anomaly: 'ML-5 · Journey anomaly',
  nlp: 'ML-6 · Report NLP',
  triage: 'ML-8 · Alert triage',
}

const RUNS_ON: Record<string, string> = {
  risk: 'Server (precomputed)',
  audio: 'Phone',
  motion: 'Phone',
  anomaly: 'Phone',
  nlp: 'ML API',
  triage: 'Database',
}

type Row = { label: string; value: string }

const pct = (v: unknown) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—')
const num = (v: unknown, d = 3) => (typeof v === 'number' ? v.toFixed(d) : Array.isArray(v) ? Number(v[0]).toFixed(d) : '—')

/** The headline metrics each training script recorded, in plain words. */
function headline(m: ModelEntry): Row[] {
  const x = m.metrics as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (m.name) {
    case 'risk':
      return [
        { label: 'ROC-AUC (top-10% slots, 2024)', value: num(x.xgboost_poisson?.roc_auc_top10) },
        { label: 'PAI @ 5% of area', value: num(x.xgboost_poisson?.pai_at_5pct, 2) },
        { label: 'Baseline (Poisson GLM) PAI', value: num(x.baseline_poisson_glm?.pai_at_5pct, 2) },
      ]
    case 'audio':
      return [
        { label: 'Threshold', value: num(x.chosen?.threshold, 2) },
        { label: 'False prompts / hour (ESC-50)', value: num(x.chosen?.per_hour, 2) },
        { label: 'Calibration audio', value: '2.78 h, 2,000 clips' },
      ]
    case 'motion':
      return [
        { label: 'Sensitivity (CNN, CV)', value: pct(x.cross_validation?.cnn?.sensitivity?.[0]) },
        { label: 'Specificity (CNN, CV)', value: pct(x.cross_validation?.cnn?.specificity?.[0]) },
        { label: 'F1 — CNN vs Random Forest', value: `${num(x.cross_validation?.cnn?.f1)} vs ${num(x.cross_validation?.random_forest?.f1)}` },
      ]
    case 'anomaly': {
      const r = x.results ?? {}
      const best = Object.entries(r).find(([k]) => k.startsWith('xgboost +'))?.[1] as Record<string, number> | undefined
      return [
        { label: 'Detection rate', value: pct(best?.detection_rate) },
        { label: 'Normal trips with a false alarm', value: pct(best?.false_alarm_trips) },
        { label: 'Rules baseline detection', value: pct(r['rules (on phone)']?.detection_rate) },
      ]
    }
    case 'nlp':
      return [
        { label: 'Category macro-F1', value: num(x.tasks?.category?.macro_f1_tfidf_char_svm) },
        { label: 'Moderation macro-F1', value: num(x.tasks?.moderation?.macro_f1_tfidf_char_svm) },
        { label: 'Urgency macro-F1', value: num(x.tasks?.urgency?.macro_f1_tfidf_char_svm) },
      ]
    default:
      return [{ label: 'Method', value: String(x.type ?? '—') }]
  }
}

export function ModelsPage() {
  const q = useModels()
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="AI models" subtitle="What each model does, where it runs and how it was evaluated" />
      {q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-72" />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
          <motion.div variants={fadeUp} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
            <StatTile label="Ride check-ins answered 'I'm OK'" value={`${q.data.feedback.tripAnsweredOk} / ${q.data.feedback.tripChecks}`} />
            <StatTile label="AI-triggered alerts marked false alarm" value={`${q.data.feedback.aiFalseAlarms} / ${q.data.feedback.aiAlertsClosed}`} />
          </motion.div>
          <motion.div variants={fadeUp} className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
            {q.data.models.map((m) => (
              <Card key={m.name} variant="panel" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[17px] font-extrabold">{TITLE[m.name] ?? m.name}</h2>
                    <span className="text-xs text-ink-3">{m.version}</span>
                  </div>
                  <Badge tone="outline">{RUNS_ON[m.name] ?? '—'}</Badge>
                </div>
                <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                  {headline(m).map((r) => (
                    <div key={r.label} className="contents">
                      <dt className="text-ink-2">{r.label}</dt>
                      <dd className="m-0 text-right font-bold tabular-nums">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {m.notes && <p className="m-0 text-xs leading-relaxed text-ink-3">{m.notes}</p>}
              </Card>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
