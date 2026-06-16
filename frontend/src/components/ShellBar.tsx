import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Clock4,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import { useCommandPalette } from './commandPaletteStore'
import { useSideNav } from './sideNavStore'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'

const TYPE_ICON: Record<AppNotification['type'], LucideIcon> = {
  approval: ShieldCheck,
  deadline: Clock4,
  system:   AlertTriangle,
}

function getDisplayRole(user: ReturnType<typeof useAuth>['user']) {
  const roleNames: Record<string, string> = {
    DEVELOPER: 'Developer',
    ADMIN: 'Administrator',
    MANAGING_DIRECTOR: 'Managing Director',
    DIRECTOR: 'Director',
    MANAGER: 'Manager',
    SUPERVISOR: 'Supervisor',
    EMPLOYEE: 'Employee',
    STAFF: 'Staff',
    OPERATOR: 'Operator',
  }
  return user?.role ? (roleNames[user.role] ?? user.role) : 'Employee'
}

export default function ShellBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const openPalette = useCommandPalette(s => s.setOpen)
  const toggleSideNav = useSideNav(s => s.toggle)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'approval' | 'deadline'>('all')
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount } = useNotifications()

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
      <button
        type="button"
        className="kbt-icon-button amw-hamburger"
        onClick={toggleSideNav}
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>
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
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          >
            <Bell size={15} />
            {unreadCount > 0 && <span className="amw-notification-dot" />}
          </button>

          {notificationOpen && (
            <div className="amw-notification-popover" role="dialog" aria-label="Notifications">
              <div className="amw-popover-head">
                <div>
                  <span>{t('shell.notifications')}</span>
                  {unreadCount > 0 && (
                    <strong style={{ marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 99,
                      background: 'rgba(229,35,33,0.12)', color: 'var(--amw-red)',
                      border: '1px solid rgba(229,35,33,0.25)' }}>
                      {unreadCount}
                    </strong>
                  )}
                </div>
                <button type="button" className="amw-popover-close" onClick={() => setNotificationOpen(false)} aria-label="Close notifications">
                  <X size={14} />
                </button>
              </div>
              <div className="amw-tag-row">
                {(['all', 'approval', 'deadline'] as const).map(tab => (
                  <button key={tab} type="button" className={activeTab === tab ? 'active' : ''}
                    onClick={() => setActiveTab(tab)} style={{ textTransform: 'capitalize' }}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="amw-notification-list">
                {(() => {
                  const visible = notifications.filter(n => activeTab === 'all' || n.type === activeTab)
                  if (visible.length === 0) {
                    return (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--kbt-text-3)', fontSize: '0.8rem' }}>
                        No notifications
                      </div>
                    )
                  }
                  return visible.map(item => {
                    const Icon = TYPE_ICON[item.type]
                    return (
                      <button key={item.id} type="button" className={`amw-notification-item ${item.type}`}
                        onClick={() => go(item.href)}>
                        <div className="amw-result-icon"><Icon size={16} /></div>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </div>
                        <em>{item.time}</em>
                      </button>
                    )
                  })
                })()}
              </div>
              {unreadCount > 0 && (
                <button type="button" className="amw-popover-action" onClick={() => go('/evaluations')}>
                  <AlertTriangle size={14} />
                  View all pending items
                </button>
              )}
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
              background: 'linear-gradient(135deg, #5c5690 0%, #25214e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700,
              flexShrink: 0,
              boxShadow: menuOpen ? 'var(--glow-blue)' : '0 0 12px rgba(92,86,144,0.3)',
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
                    background: 'linear-gradient(135deg, #5c5690 0%, #3a3470 100%)',
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
                    background: 'rgba(92,86,144,0.1)', color: 'var(--sap-blue)',
                    border: '1px solid rgba(92,86,144,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em',
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
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(92,86,144,0.08)'; e.currentTarget.style.color = 'var(--sap-blue)' }}
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
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,35,33,0.08)'; e.currentTarget.style.color = '#e52321' }}
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
