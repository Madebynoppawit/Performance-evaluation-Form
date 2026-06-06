import { lazy, Suspense, useCallback, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import SplashScreen from '@/components/SplashScreen'
import RouteFallback from '@/components/RouteFallback'

/* Route components are code-split — each loads only when first visited.
   Heavy deps (e.g. recharts on Dashboard/Reports) stay out of the initial bundle. */
const LoginPage           = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage       = lazy(() => import('@/features/dashboard/DashboardPage'))
const EvaluationListPage  = lazy(() => import('@/features/evaluations/EvaluationListPage'))
const EvaluationFormPage  = lazy(() => import('@/features/evaluations/EvaluationFormPage'))
const TemplateListPage    = lazy(() => import('@/features/templates/TemplateListPage'))
const TemplateBuilderPage = lazy(() => import('@/features/templates/TemplateBuilderPage'))
const CycleListPage       = lazy(() => import('@/features/cycles/CycleListPage'))
const ReportsPage         = lazy(() => import('@/features/reports/ReportsPage'))
const AccountPage         = lazy(() => import('@/features/account/AccountPage'))
const SettingsPage        = lazy(() => import('@/features/settings/SettingsPage'))
const GuidelinesPage      = lazy(() => import('@/features/guidelines/GuidelinesPage'))
const NotFoundPage        = lazy(() => import('@/pages/NotFoundPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const isSessionValid = useAuthStore((s) => s.isSessionValid)
  return token && isSessionValid() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="evaluations" element={<EvaluationListPage />} />
            <Route path="evaluations/:id" element={<EvaluationFormPage />} />
            <Route path="templates" element={<TemplateListPage />} />
            <Route path="templates/:id" element={<TemplateBuilderPage />} />
            <Route path="cycles" element={<CycleListPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="guidelines" element={<GuidelinesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
    </>
  )
}
