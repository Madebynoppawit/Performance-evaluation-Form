import { useAuthStore } from '@/features/auth/authStore'

// Supervisory positions (หัวหน้างานขึ้นไป): Supervisor / Manager / Director-up
// (MD, CEO). They may create evaluations and build templates.
const SUPERVISORY_POSITIONS = ['DIRECTOR_UP', 'MANAGER', 'SUPERVISOR']

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const updateUser = useAuthStore((s) => s.updateUser)
  const isSessionValid = useAuthStore((s) => s.isSessionValid)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER'
  const isSupervisory = SUPERVISORY_POSITIONS.includes(user?.position ?? '')

  return {
    user,
    token,
    logout,
    updateUser,
    isAdmin,
    isManager: user?.role === 'MANAGER' || isAdmin,
    // Can create evaluations and build templates (admin/dev or supervisory).
    canManage: isAdmin || isSupervisory,
    isAuthenticated: !!token && isSessionValid(),
  }
}
