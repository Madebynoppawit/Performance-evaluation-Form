import { useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { ToastContext, ToastType, ToastContextValue } from './toastContext'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

const STYLES: Record<ToastType, { border: string; icon: ReactNode; glow: string }> = {
  success: { border: 'rgba(0,200,122,0.3)',  glow: 'rgba(0,200,122,0.1)',  icon: <CheckCircle2 size={16} color="#00c87a" /> },
  error:   { border: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.1)',  icon: <XCircle size={16} color="#ef4444" /> },
  warning: { border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.1)', icon: <AlertTriangle size={16} color="#f59e0b" /> },
  info:    { border: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.1)', icon: <Info size={16} color="#3b82f6" /> },
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
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const s = STYLES[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px',
              background: '#111827',
              border: `1px solid ${s.border}`,
              borderRadius: 10,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${s.glow}`,
              minWidth: 280, maxWidth: 380,
              pointerEvents: 'all',
              animation: 'toastIn 0.25s ease',
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{t.title}</p>
                {t.message && <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{t.message}</p>}
              </div>
              <button onClick={() => remove(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4b5563', padding: 2, flexShrink: 0,
              }}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </ToastContext.Provider>
  )
}
