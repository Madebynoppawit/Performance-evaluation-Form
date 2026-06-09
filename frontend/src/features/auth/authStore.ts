import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  expiresAt: number | null
  setAuth: (user: User, token: string) => void
  updateUser: (user: User) => void
  logout: () => void
  isSessionValid: () => boolean
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      expiresAt: null,
      setAuth: (user, token) => set({ user, token, expiresAt: Date.now() + SESSION_TTL_MS }),
      updateUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, expiresAt: null }),
      isSessionValid: () => {
        const { token, expiresAt } = get()
        return !!token && !!expiresAt && expiresAt > Date.now()
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
