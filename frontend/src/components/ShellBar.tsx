import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock4,
  LogOut,
  Search,
  ShieldCheck,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import { useCommandPalette } from './commandPaletteStore'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'

interface NotificationItem {
  title: string
  description: string
  time: string
  type: 'approval' | 'deadline' | 'system'
  icon: LucideIcon
}

const NOTIFICATIONS: NotificationItem[] = [
  { title: '3 reviews need acknowledgement', description: 'Pending employee or manager sign-off in the current cycle.', time: 'Today', type: 'approval', icon: ShieldCheck },
  { title: 'Cycle closes in 5 days', description: 'Complete remaining evaluations before the review window closes.', time: 'Jun 9', type: 'deadline', icon: Clock4 },
  { title: 'Report snapshot is ready', description: 'Department summary and completion metrics have been refreshed.', time: '30 min', type: 'system', icon: CheckCircle2 },
]

function getDisplayRole(user: ReturnType<typeof useAuth>['user']) {
  if (user?.position === 'DIRECTOR_UP') return 'Director'
  return user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'MANAGER' ? 'Manager' : 'Employee'
}

export default function ShellBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const openPalette = useCommandPalette(s => s.setOpen)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
      if (notificationRef.current && !notificationRef.current.contains(target)) setNotificationOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function go(to: string) {
    setNotificationOpen(false)
    navigate(to)
  }

  return (
    <header className="kbt-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 104, height: 38,
          background: '#ffffff',
          borderRadius: 8,
          padding: '6px 9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(3,11,22,0.12), 0 0 0 1px rgba(255,255,255,0.08)',
        }}>
          <img src="/amw-logo.png" alt="AMW" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div className="amw-shell-brand" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--shell-text)', letterSpacing: '0.01em' }}>
            AMW
          </span>
          <span style={{ fontSize: '0.625rem', color: 'var(--shell-text-2)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Evaluation System
          </span>
        </div>
      </div>

      <div className="amw-shell-divider" style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

      {/* Command palette trigger */}
      <div className="amw-search-wrap">
        <button type="button" className="kbt-command" onClick={() => openPalette(true)} aria-haspopup="dialog" aria-label="Open command palette">
          <Search size={16} />
          <span>{t('shell.search')}</span>
          <span className="kbt-kbd">CTRL K</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <LanguageSwitcher />
        <ThemeToggle />
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`kbt-icon-button${notificationOpen ? ' active' : ''}`}
            style={{ position: 'relative' }}
            onClick={() => setNotificationOpen(v => !v)}
            aria-haspopup="dialog"
            aria-expanded={notificationOpen}
            aria-label="Open notifications"
          >
            <Bell size={15} />
            <span className="amw-notification-dot" />
          </button>

          {notificationOpen && (
            <div className="amw-notification-popover" role="dialog" aria-label="Notifications">
              <div className="amw-popover-head">
                <div>
                  <span>{t('shell.notifications')} <em className="amw-sample-tag">Sample</em></span>
                  <strong>{t('shell.preview')}</strong>
                </div>
                <button type="button" className="amw-popover-close" onClick={() => setNotificationOpen(false)} aria-label="Close notifications">
                  <X size={14} />
                </button>
              </div>
              <div className="amw-tag-row">
                <button type="button" className="active">All</button>
                <button type="button">Approval</button>
                <button type="button">Deadline</button>
              </div>
              <div className="amw-notification-list">
                {NOTIFICATIONS.map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.title} type="button" className={`amw-notification-item ${item.type}`} onClick={() => go(item.type === 'system' ? '/reports' : '/evaluations')}>
                      <div className="amw-result-icon"><Icon size={16} /></div>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </div>
                      <em>{item.time}</em>
                    </button>
                  )
                })}
              </div>
              <button type="button" className="amw-popover-action" onClick={() => go('/evaluations')}>
                <AlertTriangle size={14} />
                Review pending items
              </button>
            </div>
          )}
        </div>

        <div ref={menuRef} style={{ position: 'relative', marginLeft: 4 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 10px', height: 34, borderRadius: 8,
              background: menuOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: menuOpen ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.18s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #0a6ed1 0%, #292552 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700,
              flexShrink: 0,
              boxShadow: menuOpen ? 'var(--glow-blue)' : '0 0 12px rgba(10,110,209,0.3)',
              transition: 'box-shadow 0.18s',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <span className="amw-shell-username" style={{ fontSize: '0.8125rem', color: 'var(--shell-text-2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </span>
            <ChevronDown size={12} color="var(--shell-text-2)" />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              width: 230, background: 'var(--kbt-card)',
              border: '1px solid var(--kbt-border)',
              borderRadius: 10,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              overflow: 'hidden', zIndex: 200,
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'linear-gradient(135deg, #0a6ed1 0%, #0854a0 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', fontSize: '0.875rem', fontWeight: 700,
                  }}>
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginTop: 1 }}>{user?.email}</p>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px',
                    borderRadius: 4, fontSize: '0.625rem', fontWeight: 600,
                    background: 'rgba(10,110,209,0.1)', color: 'var(--sap-blue)',
                    border: '1px solid rgba(10,110,209,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {getDisplayRole(user)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setMenuOpen(false); navigate('/account') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '11px 16px', fontSize: '0.875rem',
                  color: 'var(--kbt-text-2)', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,110,209,0.08)'; e.currentTarget.style.color = 'var(--sap-blue)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--kbt-text-2)' }}
              >
                <User size={14} />
                {t('shell.accountUser')}
              </button>

              <button
                onClick={() => { logout(); navigate('/login') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '11px 16px', fontSize: '0.875rem',
                  color: 'var(--kbt-text-2)', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(237,28,36,0.08)'; e.currentTarget.style.color = '#ed1c24' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--kbt-text-2)' }}
              >
                <LogOut size={14} />
                {t('shell.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
