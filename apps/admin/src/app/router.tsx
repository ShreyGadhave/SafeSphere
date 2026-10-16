import { createBrowserRouter } from 'react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AnalyticsPage } from '@/pages/Analytics/AnalyticsPage'
import { GuardiansPage } from '@/pages/Guardians/GuardiansPage'
import { LiveAlertsPage } from '@/pages/LiveAlerts/LiveAlertsPage'
import { ModelsPage } from '@/pages/Models/ModelsPage'
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage'
import { ReportsPage } from '@/pages/Reports/ReportsPage'
import { RiskMapPage } from '@/pages/RiskMap/RiskMapPage'
import { SignInPage } from '@/pages/SignIn/SignInPage'
import { TripsPage } from '@/pages/Trips/TripsPage'
import { RequireAdmin } from './RequireAdmin'

export const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <LiveAlertsPage /> },
          { path: 'trips', element: <TripsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'risk-map', element: <RiskMapPage /> },
          { path: 'guardians', element: <GuardiansPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'models', element: <ModelsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
