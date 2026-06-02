import { Bell, Search, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.625rem', fontWeight: 800, color: '#000', letterSpacing: '-0.02em',
        }}>
          PE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.01em' }}>
            Performance
          </span>
          <span style={{ fontSize: '0.625rem', color: '#00c87a', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Evaluation System
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#4b5563', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5563' }}
        >
          <Search size={15} />
        </button>

        <button
          style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#4b5563', transition: 'all 0.15s', position: 'relative',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5563' }}
        >
          <Bell size={15} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 6, height: 6, borderRadius: '50%',
            background: '#00c87a', boxShadow: '0 0 6px rgba(0,200,122,0.8)',
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
              border: menuOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontSize: '0.6875rem', fontWeight: 700,
              flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </span>
            <ChevronDown size={12} color="#4b5563" />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              width: 230, background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
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
                    background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontSize: '0.875rem', fontWeight: 700,
                  }}>
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#4b5563', marginTop: 1 }}>{user?.email}</p>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px',
                    borderRadius: 4, fontSize: '0.625rem', fontWeight: 600,
                    background: 'rgba(0,200,122,0.1)', color: '#00c87a',
                    border: '1px solid rgba(0,200,122,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em',
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
                  color: '#94a3b8', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8' }}
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
