import { NavLink } from 'react-router-dom'
import { BarChart2, ClipboardList, LayoutDashboard, LayoutTemplate, RefreshCw, Settings, UserRound } from 'lucide-react'

const workspaceNav = [
  { to: '/', label: 'Dashboard', sublabel: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/evaluations', label: 'Evaluations', sublabel: 'Review workflow', icon: ClipboardList },
  { to: '/templates', label: 'Templates', sublabel: 'Form builder', icon: LayoutTemplate },
  { to: '/cycles', label: 'Cycles', sublabel: 'Review periods', icon: RefreshCw },
  { to: '/reports', label: 'Reports', sublabel: 'Performance BI', icon: BarChart2 },
]

const userNav = [
  { to: '/account', label: 'Account', sublabel: 'User access', icon: UserRound },
  { to: '/settings', label: 'Settings', sublabel: 'Preferences', icon: Settings },
]

function NavItem({ to, label, sublabel, icon: Icon, end }: typeof workspaceNav[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className="kbt-nav-item"
      style={({ isActive }) => ({
        color: isActive ? 'var(--sap-blue)' : 'var(--kbt-text-2)',
        background: isActive ? 'rgba(10,110,209,0.08)' : 'transparent',
        fontWeight: isActive ? 700 : 500,
      })}
    >
      {({ isActive }) => (
        <>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: isActive ? 'var(--brand-gradient)' : 'var(--control-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.16s',
          }}>
            <Icon size={15} color={isActive ? '#ffffff' : 'var(--kbt-text-3)'} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.8375rem', lineHeight: 1.2, color: isActive ? 'var(--kbt-text)' : 'var(--kbt-text-2)' }}>
              {label}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', marginTop: 2, letterSpacing: '0.02em' }}>
              {sublabel}
            </p>
          </div>
        </>
      )}
    </NavLink>
  )
}

export default function SideNav() {
  return (
    <aside className="kbt-sidebar">
      <div style={{ padding: '18px 16px 10px', borderBottom: '1px solid var(--kbt-border)' }}>
        <p style={{
          fontSize: '0.625rem',
          fontWeight: 800,
          color: 'var(--kbt-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          Workspace
        </p>
      </div>

      <nav style={{ padding: '8px 0', flex: 1 }}>
        {workspaceNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <nav className="kbt-user-nav">
        {userNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <div style={{ padding: 14, borderTop: '1px solid var(--kbt-border)' }}>
        <div style={{
          padding: '11px 14px',
          borderRadius: 12,
          border: '1px solid rgba(10,110,209,0.18)',
          background: 'linear-gradient(135deg, rgba(10,110,209,0.08), rgba(10,110,209,0.02))',
          boxShadow: '0 0 24px rgba(10,110,209,0.06)',
        }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--kbt-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 800 }}>
            v0.1.0 · AMW Command
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
            <span className="kbt-dot-live" />
            <span style={{ fontSize: '0.6875rem', color: 'var(--m-light-blue)', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Systems nominal
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
