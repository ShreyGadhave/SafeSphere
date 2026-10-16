import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter } from 'react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage'
import { SignInPage } from '@/pages/SignIn/SignInPage'
import { RequireAdmin } from './RequireAdmin'

/** Lazy-load a named page export so each page (and the public share pages) is its own chunk. */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K): LazyExoticComponent<ComponentType> {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}

const LiveAlertsPage = page(() => import('@/pages/LiveAlerts/LiveAlertsPage'), 'LiveAlertsPage')
const AlertDetailPage = page(() => import('@/pages/AlertDetail/AlertDetailPage'), 'AlertDetailPage')
const ReportsPage = page(() => import('@/pages/Reports/ReportsPage'), 'ReportsPage')
const TripsPage = page(() => import('@/pages/Trips/TripsPage'), 'TripsPage')
const RiskMapPage = page(() => import('@/pages/RiskMap/RiskMapPage'), 'RiskMapPage')
const GuardiansPage = page(() => import('@/pages/Guardians/GuardiansPage'), 'GuardiansPage')
const AnalyticsPage = page(() => import('@/pages/Analytics/AnalyticsPage'), 'AnalyticsPage')
const ModelsPage = page(() => import('@/pages/Models/ModelsPage'), 'ModelsPage')
const LiveSharePage = page(() => import('@/pages/Share/LiveSharePage'), 'LiveSharePage')
const TripSharePage = page(() => import('@/pages/Share/TripSharePage'), 'TripSharePage')

function withSuspense(Page: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading page" className="min-h-[50vh]" />}>
      <Page />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  // Public, no sign-in: opened by emergency contacts from an SMS link.
  { path: '/live/:token', element: withSuspense(LiveSharePage) },
  { path: '/trip/:token', element: withSuspense(TripSharePage) },

  { path: '/sign-in', element: <SignInPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: withSuspense(LiveAlertsPage) },
          { path: 'alerts/:id', element: withSuspense(AlertDetailPage) },
          { path: 'trips', element: withSuspense(TripsPage) },
          { path: 'reports', element: withSuspense(ReportsPage) },
          { path: 'risk-map', element: withSuspense(RiskMapPage) },
          { path: 'guardians', element: withSuspense(GuardiansPage) },
          { path: 'analytics', element: withSuspense(AnalyticsPage) },
          { path: 'models', element: withSuspense(ModelsPage) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
