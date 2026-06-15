import { useAuthStore } from '@/features/auth/authStore'
import { SUPERVISORY_POSITIONS } from '@/config/accessPolicy'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const updateUser = useAuthStore((s) => s.updateUser)
  const isSessionValid = useAuthStore((s) => s.isSessionValid)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER'
  const isDeveloper = user?.role === 'DEVELOPER'
  const isSupervisory = user?.position
    ? SUPERVISORY_POSITIONS.includes(user.position)
    : false

  return {
    user,
    token,
    logout,
    updateUser,
    isAdmin,
    isDeveloper,
    isManager: user?.role === 'MANAGER' || isAdmin,
    // Only Developer and supervisory roles (Supervisor/Manager/Director) can create evaluations.
    canManage: isDeveloper || isSupervisory || user?.role === 'MANAGER',
    isAuthenticated: !!token && isSessionValid(),
  }
}
