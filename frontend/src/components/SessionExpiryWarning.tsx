import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import api from '@/lib/api'

const WARN_BEFORE_MS = 5 * 60 * 1000  // show warning 5 min before expiry
const CHECK_INTERVAL_MS = 30 * 1000   // check every 30 s

export default function SessionExpiryWarning() {
  const navigate = useNavigate()
  const expiresAt = useAuthStore(s => s.expiresAt)
  const setAuth = useAuthStore(s => s.setAuth)
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)

  const [show, setShow] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [extending, setExtending] = useState(false)

  useEffect(() => {
    const tick = () => {
      if (!expiresAt) return
      const ms = expiresAt - Date.now()
      if (ms <= 0) {
        // Already expired — ProtectedRoute will redirect; just clean up
        setShow(false)
        return
      }
      if (ms <= WARN_BEFORE_MS) {
        setShow(true)
        setSecondsLeft(Math.ceil(ms / 1000))
      } else {
        setShow(false)
      }
    }

    tick()
    const id = setInterval(tick, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [expiresAt])

  // Countdown timer once the warning is visible
  useEffect(() => {
    if (!show) return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [show])

  async function extend() {
    setExtending(true)
    try {
      const res = await api.get('/auth/me')
      if (user) setAuth(res.data, useAuthStore.getState().token!)
      setShow(false)
    } catch {
      // Token already invalid — force logout
      logout()
      navigate('/login', { replace: true })
    } finally {
      setExtending(false)
    }
  }

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  if (!show) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const countdown = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--kbt-card)', border: '1px solid var(--kbt-border)',
        borderRadius: 16, padding: '32px 28px', maxWidth: 380, width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(229,35,33,0.1)', border: '1px solid rgba(229,35,33,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={20} color="var(--amw-red)" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--kbt-text)', marginBottom: 4 }}>
              Session expiring soon
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--kbt-text-3)', lineHeight: 1.5 }}>
              Your session will end in <strong style={{ color: 'var(--amw-red)', fontFamily: 'monospace' }}>{countdown}</strong>. Unsaved changes will be lost.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={extend}
            disabled={extending}
            className="kbt-btn-primary"
            style={{ flex: 1, height: 40, fontSize: '0.875rem' }}
          >
            {extending
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Extending…</>
              : <><RefreshCw size={14} /> Stay logged in</>}
          </button>
          <button
            onClick={signOut}
            className="kbt-btn-ghost"
            style={{ height: 40, padding: '0 16px', fontSize: '0.875rem' }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
