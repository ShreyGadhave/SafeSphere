import { motion } from 'motion/react'
import { fadeUp } from '@/lib/motion'

type StatTileProps = {
  label: string
  value: string
  /** Shows the pulsing red dot used for live SOS counts. */
  live?: boolean
}

export function StatTile({ label, value, live = false }: StatTileProps) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-1.5 rounded-card bg-card p-[18px]">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3">
        {live && <span aria-hidden="true" className="size-2 animate-beat rounded-full bg-danger" />}
        {label}
      </span>
      <span className="text-[32px] leading-tight font-extrabold tracking-[-0.02em]">{value}</span>
    </motion.div>
  )
}
