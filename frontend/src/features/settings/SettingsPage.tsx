import { Bell, Eye, Languages, LockKeyhole, Monitor, ShieldCheck, UserCog } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

const settingGroups = [
  {
    title: 'User Preferences',
    eyebrow: 'General',
    items: [
      { label: 'Default workspace', value: 'Dashboard overview', icon: Monitor },
      { label: 'Language', value: 'English / Thai ready', icon: Languages },
      { label: 'Role view', value: 'User-level navigation', icon: UserCog },
    ],
  },
  {
    title: 'Notifications',
    eyebrow: 'Alerts',
    items: [
      { label: 'Evaluation reminders', value: 'On', icon: Bell },
      { label: 'Report updates', value: 'On', icon: ShieldCheck },
      { label: 'Deadline warnings', value: 'Priority', icon: Eye },
    ],
  },
  {
    title: 'Privacy & Access',
    eyebrow: 'Account',
    items: [
      { label: 'Session protection', value: 'Enabled', icon: LockKeyhole },
      { label: 'Audit visibility', value: 'Role based', icon: ShieldCheck },
      { label: 'Personal data mode', value: 'PDPA aware', icon: Eye },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">User Settings</span>
          <h1>Settings</h1>
          <p>Control personal preferences, notification behavior, and account-level access comfort.</p>
        </div>
      </div>

      <section className="amw-settings-hero">
        <div>
          <span>Display Mode</span>
          <h2>Personal workspace controls</h2>
          <p>Simple settings for daily users without exposing administrator tools.</p>
        </div>
        <div className="amw-settings-theme">
          <ThemeToggle />
        </div>
      </section>

      <div className="amw-settings-grid">
        {settingGroups.map(group => (
          <section key={group.title} className="kbt-card amw-settings-panel">
            <div className="amw-settings-panel-head">
              <span>{group.eyebrow}</span>
              <strong>{group.title}</strong>
            </div>
            <div className="amw-settings-list">
              {group.items.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="amw-settings-row">
                    <div className="amw-settings-icon"><Icon size={16} /></div>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                    <button type="button" disabled aria-label={`Configure ${item.label} (coming soon)`} title="Coming soon">Soon</button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
