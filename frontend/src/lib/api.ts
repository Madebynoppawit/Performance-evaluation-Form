import axios from 'axios'
import { useAuthStore } from '@/features/auth/authStore'

const api = axios.create({
  // Empty in dev uses the Vite proxy at "/api"; set VITE_API_BASE_URL in prod.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

function createRequestId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Login / register need no token and must never be blocked or redirected by
// a stale session — the login form handles their errors itself.
const isAuthEndpoint = (url?: string) => !!url && /\/auth\/(login|register)\b/.test(url)

api.interceptors.request.use((config) => {
  const auth = useAuthStore.getState()
  if (isAuthEndpoint(config.url)) {
    config.headers['X-Request-Id'] = createRequestId()
    return config
  }
  if (auth.token && !auth.isSessionValid()) {
    auth.logout()
    window.location.href = '/login'
    throw new axios.CanceledError('Session expired')
  }
  const token = auth.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Request-Id'] = createRequestId()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isAuthEndpoint(err.config?.url)) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
