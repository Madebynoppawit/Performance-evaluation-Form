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
  const isManagerLike = user?.role === 'MANAGER'
    || user?.role === 'MANAGING_DIRECTOR'
    || user?.role === 'DIRECTOR'
    || user?.role === 'SUPERVISOR'

  return {
    user,
    token,
    logout,
    updateUser,
    isAdmin,
    isDeveloper,
    isManager: isManagerLike || isAdmin,
    canManage: isDeveloper || isSupervisory || isManagerLike,
    isAuthenticated: !!token && isSessionValid(),
  }
}
