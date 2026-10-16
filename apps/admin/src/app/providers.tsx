import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

/** App-wide providers. reducedMotion="user" turns animations off when the OS asks for it. */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
