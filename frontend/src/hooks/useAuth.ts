import { useAuthStore } from '@/features/auth/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const isSessionValid = useAuthStore((s) => s.isSessionValid)

  return {
    user,
    token,
    logout,
    isAdmin: user?.role === 'ADMIN',
    isManager: user?.role === 'MANAGER' || user?.role === 'ADMIN',
    isAuthenticated: !!token && isSessionValid(),
  }
}
