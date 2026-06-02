import { NavLink } from 'react-router-dom'
import { ClipboardList, LayoutTemplate, RefreshCw, BarChart2 } from 'lucide-react'

const navItems = [
  { to: '/evaluations', label: 'แบบประเมิน',   sublabel: 'Evaluations',   icon: ClipboardList },
  { to: '/templates',   label: 'แม่แบบฟอร์ม',   sublabel: 'Templates',     icon: LayoutTemplate },
  { to: '/cycles',      label: 'รอบการประเมิน', sublabel: 'Cycles',        icon: RefreshCw },
  { to: '/reports',     label: 'รายงาน',         sublabel: 'Reports',       icon: BarChart2 },
]

export default function SideNav() {
  return (
    <aside className="kbt-sidebar">
      {/* System label */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{
          fontSize: '0.625rem', fontWeight: 700, color: '#4b5563',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Main Menu
        </p>
      </div>

      <nav style={{ padding: '6px 0', flex: 1 }}>
        {navItems.map(({ to, label, sublabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="kbt-nav-item"
            style={({ isActive }) => ({
              color: isActive ? '#00c87a' : '#94a3b8',
              background: isActive ? 'rgba(0,200,122,0.07)' : 'transparent',
              borderLeftColor: isActive ? '#00c87a' : 'transparent',
              fontWeight: isActive ? 600 : 400,
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: isActive ? 'rgba(0,200,122,0.12)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}>
                  <Icon size={15} color={isActive ? '#00c87a' : '#4b5563'} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', lineHeight: 1.2, color: isActive ? '#00c87a' : '#94a3b8' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '0.625rem', color: '#4b5563', marginTop: 1, letterSpacing: '0.02em' }}>
                    {sublabel}
                  </p>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize: '0.625rem', color: '#4b5563', letterSpacing: '0.04em' }}>
          v1.0.0 · KBTG Theme
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
            animation: 'pulseGreen 2s ease infinite',
          }} />
          <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            System Online
          </span>
        </div>
      </div>
    </aside>
  )
}
