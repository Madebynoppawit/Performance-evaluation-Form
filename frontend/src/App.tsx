import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import EvaluationListPage from '@/features/evaluations/EvaluationListPage'
import EvaluationFormPage from '@/features/evaluations/EvaluationFormPage'
import TemplateListPage from '@/features/templates/TemplateListPage'
import TemplateBuilderPage from '@/features/templates/TemplateBuilderPage'
import CycleListPage from '@/features/cycles/CycleListPage'
import ReportsPage from '@/features/reports/ReportsPage'
import NotFoundPage from '@/pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
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
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
