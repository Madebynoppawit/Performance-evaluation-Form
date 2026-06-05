import { useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { ToastContext, ToastType, ToastContextValue } from './toastContext'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

const STYLES: Record<ToastType, { border: string; glow: string; accent: string; icon: ReactNode }> = {
  success: {
    border: 'rgba(129,196,255,0.28)',
    glow:   '0 0 32px rgba(10,110,209,0.16)',
    accent: '#81c4ff',
    icon: <CheckCircle2 size={15} color="#81c4ff" />,
  },
  error: {
    border: 'rgba(237,28,36,0.28)',
    glow:   '0 0 32px rgba(237,28,36,0.16)',
    accent: '#ed1c24',
    icon: <XCircle size={15} color="#ed1c24" />,
  },
  warning: {
    border: 'rgba(237,28,36,0.24)',
    glow:   '0 0 32px rgba(237,28,36,0.12)',
    accent: '#ed1c24',
    icon: <AlertTriangle size={15} color="#ed1c24" />,
  },
  info: {
    border: 'rgba(10,110,209,0.28)',
    glow:   '0 0 32px rgba(10,110,209,0.18)',
    accent: '#0a6ed1',
    icon: <Info size={15} color="#0a6ed1" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const value: ToastContextValue = {
    toast: add,
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const s = STYLES[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '13px 16px',
              background: 'rgba(10,16,30,0.88)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${s.border}`,
              borderRadius: 14,
              boxShadow: `0 24px 56px rgba(0,0,0,0.55), ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              minWidth: 300, maxWidth: 400,
              pointerEvents: 'all',
              animation: 'toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Accent left bar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: s.accent, borderRadius: '14px 0 0 14px' }} />
              <span style={{ flexShrink: 0, marginTop: 1, marginLeft: 6 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#eaf2ff', letterSpacing: '0.01em' }}>{t.title}</p>
                {t.message && <p style={{ fontSize: '0.75rem', color: '#a8b7cc', marginTop: 3, lineHeight: 1.5 }}>{t.message}</p>}
              </div>
              <button onClick={() => remove(t.id)} className="amw-toast-close" style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, cursor: 'pointer', color: '#6b7a90', padding: '3px 4px',
                flexShrink: 0, transition: 'all 0.14s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={12} />
              </button>
              {/* Auto-dismiss countdown */}
              <span className="amw-toast-countdown" style={{ background: s.accent }} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
