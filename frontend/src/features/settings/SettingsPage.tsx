import { Bell, Eye, Languages, LockKeyhole, Monitor, ShieldCheck, UserCog } from 'lucide-react'
import type { ReactNode } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import Toggle from '@/components/Toggle'
import { usePreferences, type Preferences } from '@/hooks/usePreferences'

const WORKSPACE_OPTS = [
  { value: 'dashboard', label: 'Dashboard overview' },
  { value: 'evaluations', label: 'Evaluations' },
  { value: 'reports', label: 'Reports' },
] as const

const LANGUAGE_OPTS = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'ไทย' },
  { value: 'fr', label: 'Français' },
] as const

const DEADLINE_OPTS = [
  { value: 'priority', label: 'Priority only' },
  { value: 'all', label: 'All deadlines' },
  { value: 'off', label: 'Off' },
] as const

export default function SettingsPage() {
  const { prefs, update } = usePreferences()

  function Row({ icon, label, hint, control }: { icon: ReactNode; label: string; hint: string; control: ReactNode }) {
    return (
      <div className="amw-settings-row">
        <div className="amw-settings-icon">{icon}</div>
        <div>
          <strong>{label}</strong>
          <span>{hint}</span>
        </div>
        <div className="amw-settings-control">{control}</div>
      </div>
    )
  }

  function Select<K extends keyof Preferences>({ field, options }: {
    field: K
    options: readonly { value: Preferences[K]; label: string }[]
  }) {
    return (
      <select
        className="kbt-select amw-settings-select"
        value={prefs[field] as string}
        onChange={e => update(field, e.target.value as Preferences[K])}
      >
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">User Settings</span>
          <h1>Settings</h1>
          <p>Control personal preferences, notification behavior, and account-level access comfort.</p>
        </div>
        <span className="amw-corp-chip amw-corp-chip--cert">Saved locally</span>
      </div>

      <section className="amw-settings-hero">
        <div>
          <span>Display Mode</span>
          <h2>Personal workspace controls</h2>
          <p>Changes apply instantly and are remembered on this device.</p>
        </div>
        <div className="amw-settings-theme">
          <ThemeToggle />
        </div>
      </section>

      <div className="amw-settings-grid">
        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>General</span>
            <strong>User Preferences</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<Monitor size={16} />} label="Default workspace" hint="Landing page after sign-in"
              control={<Select field="defaultWorkspace" options={WORKSPACE_OPTS} />} />
            <Row icon={<Languages size={16} />} label="Language" hint="Interface language preference"
              control={<Select field="language" options={LANGUAGE_OPTS} />} />
            <Row icon={<UserCog size={16} />} label="Role view" hint="Navigation scoped to your role"
              control={<span className="amw-settings-static">Auto · role-based</span>} />
          </div>
        </section>

        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>Alerts</span>
            <strong>Notifications</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<Bell size={16} />} label="Evaluation reminders" hint="Nudges for pending reviews"
              control={<Toggle label="Evaluation reminders" checked={prefs.evaluationReminders} onChange={v => update('evaluationReminders', v)} />} />
            <Row icon={<ShieldCheck size={16} />} label="Report updates" hint="When new analytics are ready"
              control={<Toggle label="Report updates" checked={prefs.reportUpdates} onChange={v => update('reportUpdates', v)} />} />
            <Row icon={<Eye size={16} />} label="Deadline warnings" hint="How aggressively to warn"
              control={<Select field="deadlineWarnings" options={DEADLINE_OPTS} />} />
          </div>
        </section>

        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>Account</span>
            <strong>Privacy &amp; Access</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<LockKeyhole size={16} />} label="Session protection" hint="Auto-lock idle sessions"
              control={<Toggle label="Session protection" checked={prefs.sessionProtection} onChange={v => update('sessionProtection', v)} />} />
            <Row icon={<ShieldCheck size={16} />} label="Audit visibility" hint="Who can see your activity"
              control={<span className="amw-settings-static">Role based</span>} />
            <Row icon={<Eye size={16} />} label="Personal data mode" hint="PDPA-aware data handling"
              control={<Toggle label="Personal data mode" checked={prefs.personalDataMode} onChange={v => update('personalDataMode', v)} />} />
          </div>
        </section>
      </div>
    </div>
  )
}
