import { Bell, Search, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from './ThemeToggle'

export default function ShellBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="kbt-header" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 104, height: 38,
          background: '#ffffff',
          borderRadius: 8,
          padding: '6px 9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(3,11,22,0.12), 0 0 0 1px rgba(255,255,255,0.08)',
        }}>
          <img
            src="/amw-logo.png"
            alt="AMW"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--shell-text)', letterSpacing: '0.01em' }}>
            AMW
          </span>
          <span style={{ fontSize: '0.625rem', color: 'var(--shell-text-2)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Evaluation System
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div className="kbt-command" style={{ cursor: 'pointer', transition: 'all 0.18s', maxWidth: 380, width: '100%' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(10,110,209,0.4)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(10,110,209,0.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
        >
          <Search size={14} />
          <span>Search employee, cycle, report...</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.625rem', color: 'var(--kbt-text-3)', border: '1px solid var(--kbt-border)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
            CTRL K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ThemeToggle />
        <button className="kbt-icon-button" style={{ position: 'relative' }}>
          <Bell size={15} />
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--sap-blue)',
            boxShadow: '0 0 8px rgba(10,110,209,0.7), 0 0 16px rgba(10,110,209,0.4)',
            animation: 'pulse-live 2s ease infinite',
          }} />
        </button>

        {/* User menu */}
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--shell-text-2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              {/* User info */}
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
                    {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'MANAGER' ? 'Manager' : 'Employee'}
                  </span>
                </div>
              </div>

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
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
