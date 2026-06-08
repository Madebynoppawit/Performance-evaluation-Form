import { NavLink } from 'react-router-dom'
import { BarChart2, BookOpen, ClipboardList, FileJson2, LayoutDashboard, LayoutTemplate, RefreshCw, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import type { TranslationKey } from '@/i18n/translations'

const workspaceNav = [
  { to: '/', labelKey: 'nav.dashboard', subKey: 'nav.dashboard.sub', icon: LayoutDashboard, end: true },
  { to: '/evaluations', labelKey: 'nav.evaluations', subKey: 'nav.evaluations.sub', icon: ClipboardList },
  { to: '/templates', labelKey: 'nav.templates', subKey: 'nav.templates.sub', icon: LayoutTemplate },
  { to: '/cycles', labelKey: 'nav.cycles', subKey: 'nav.cycles.sub', icon: RefreshCw },
  { to: '/reports', labelKey: 'nav.reports', subKey: 'nav.reports.sub', icon: BarChart2 },
] as const

const userNav = [
  { to: '/guidelines', labelKey: 'nav.guidelines', subKey: 'nav.guidelines.sub', icon: BookOpen },
  { to: '/account', labelKey: 'nav.account', subKey: 'nav.account.sub', icon: UserRound },
  { to: '/settings', labelKey: 'nav.settings', subKey: 'nav.settings.sub', icon: Settings },
] as const

const adminNav = [
  { href: '/api/docs/', labelKey: 'nav.apiDocs', subKey: 'nav.apiDocs.sub', icon: FileJson2 },
] as const

interface NavItemProps {
  to: string
  labelKey: TranslationKey
  subKey: TranslationKey
  icon: typeof LayoutDashboard
  end?: boolean
}

function NavItem({ to, labelKey, subKey, icon: Icon, end }: NavItemProps) {
  const t = useT()
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
              {t(labelKey)}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', marginTop: 2, letterSpacing: '0.02em' }}>
              {t(subKey)}
            </p>
          </div>
        </>
      )}
    </NavLink>
  )
}

interface ExternalNavItemProps {
  href: string
  labelKey: TranslationKey
  subKey: TranslationKey
  icon: typeof LayoutDashboard
}

function ExternalNavItem({ href, labelKey, subKey, icon: Icon }: ExternalNavItemProps) {
  const t = useT()
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="kbt-nav-item"
      style={{ color: 'var(--kbt-text-2)', background: 'transparent', fontWeight: 500 }}
    >
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--control-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.16s',
      }}>
        <Icon size={15} color="var(--kbt-text-3)" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.8375rem', lineHeight: 1.2, color: 'var(--kbt-text-2)' }}>
          {t(labelKey)}
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', marginTop: 2, letterSpacing: '0.02em' }}>
          {t(subKey)}
        </p>
      </div>
    </a>
  )
}

export default function SideNav() {
  const t = useT()
  const { isAdmin } = useAuth()
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
          {t('nav.workspace')}
        </p>
      </div>

      <nav style={{ padding: '8px 0', flex: 1 }}>
        {workspaceNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <nav className="kbt-user-nav">
        {userNav.map(item => <NavItem key={item.to} {...item} />)}
        {isAdmin && adminNav.map(item => <ExternalNavItem key={item.href} {...item} />)}
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
            v0.1.0 / AMW Command
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
            <span className="kbt-dot-live" />
            <span style={{ fontSize: '0.6875rem', color: 'var(--m-light-blue)', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('nav.systemsNominal')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
