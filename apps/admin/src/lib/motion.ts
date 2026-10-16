import type { Variants } from 'motion/react'

/** Shared entrance motion: a short staggered fade-up. MotionConfig reducedMotion="user" disables it. */
export const ease = [0.2, 0.8, 0.2, 1] as const

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
}
