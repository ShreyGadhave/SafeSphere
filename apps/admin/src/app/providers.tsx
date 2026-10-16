import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from './auth/AuthProvider'

/** App-wide providers. reducedMotion="user" turns animations off when the OS asks for it. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  )
}
