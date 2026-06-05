import { useCallback, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import SplashScreen from '@/components/SplashScreen'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import EvaluationListPage from '@/features/evaluations/EvaluationListPage'
import EvaluationFormPage from '@/features/evaluations/EvaluationFormPage'
import TemplateListPage from '@/features/templates/TemplateListPage'
import TemplateBuilderPage from '@/features/templates/TemplateBuilderPage'
import CycleListPage from '@/features/cycles/CycleListPage'
import ReportsPage from '@/features/reports/ReportsPage'
import AccountPage from '@/features/account/AccountPage'
import SettingsPage from '@/features/settings/SettingsPage'
import GuidelinesPage from '@/features/guidelines/GuidelinesPage'
import NotFoundPage from '@/pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
    <ErrorBoundary>
      <BrowserRouter>
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
      </BrowserRouter>
    </ErrorBoundary>
    </>
  )
}
