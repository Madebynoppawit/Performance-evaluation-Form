import { Bell, Eye, Languages, LockKeyhole, Monitor, ShieldCheck, UserCog } from 'lucide-react'
import type { ReactNode } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import Toggle from '@/components/Toggle'
import { usePreferences, type Preferences } from '@/hooks/usePreferences'
import { useT, useLanguage } from '@/i18n/languageContext'
import type { Locale, TranslationKey } from '@/i18n/translations'

const WORKSPACE_OPTS = [
  { value: 'dashboard', labelKey: 'opt.workspace.dashboard' },
  { value: 'evaluations', labelKey: 'opt.workspace.evaluations' },
  { value: 'reports', labelKey: 'opt.workspace.reports' },
] as const

const LANGUAGE_OPTS = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'ไทย' },
  { value: 'fr', label: 'Français' },
] as const

const DEADLINE_OPTS = [
  { value: 'priority', labelKey: 'opt.deadline.priority' },
  { value: 'all', labelKey: 'opt.deadline.all' },
  { value: 'off', labelKey: 'opt.deadline.off' },
] as const

export default function SettingsPage() {
  const { prefs, update } = usePreferences()
  const { locale, setLocale } = useLanguage()
  const t = useT()

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
    options: readonly { value: Preferences[K]; label?: string; labelKey?: TranslationKey }[]
  }) {
    return (
      <select
        className="kbt-select amw-settings-select"
        value={prefs[field] as string}
        onChange={e => update(field, e.target.value as Preferences[K])}
      >
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.labelKey ? t(o.labelKey) : o.label}</option>)}
      </select>
    )
  }

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.settings.eyebrow')}</span>
          <h1>{t('page.settings.title')}</h1>
          <p>{t('page.settings.desc')}</p>
        </div>
        <span className="amw-corp-chip amw-corp-chip--cert">{t('common.savedLocally')}</span>
      </div>

      <section className="amw-settings-hero">
        <div>
          <span>{t('set.displayMode')}</span>
          <h2>{t('set.personalControls')}</h2>
          <p>{t('set.changesApply')}</p>
        </div>
        <div className="amw-settings-theme">
          <ThemeToggle />
        </div>
      </section>

      <div className="amw-settings-grid">
        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>{t('set.general')}</span>
            <strong>{t('set.userPrefs')}</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<Monitor size={16} />} label={t('set.defaultWorkspace')} hint={t('set.defaultWorkspaceHint')}
              control={<Select field="defaultWorkspace" options={WORKSPACE_OPTS} />} />
            <Row icon={<Languages size={16} />} label={t('set.language')} hint={t('set.languageHint')}
              control={
                <select
                  className="kbt-select amw-settings-select"
                  value={locale}
                  onChange={e => setLocale(e.target.value as Locale)}
                >
                  {LANGUAGE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              } />
            <Row icon={<UserCog size={16} />} label={t('set.roleView')} hint={t('set.roleViewHint')}
              control={<span className="amw-settings-static">{t('set.roleViewStatic')}</span>} />
          </div>
        </section>

        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>{t('set.alerts')}</span>
            <strong>{t('set.notifications')}</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<Bell size={16} />} label={t('set.evalReminders')} hint={t('set.evalRemindersHint')}
              control={<Toggle label={t('set.evalReminders')} checked={prefs.evaluationReminders} onChange={v => update('evaluationReminders', v)} />} />
            <Row icon={<ShieldCheck size={16} />} label={t('set.reportUpdates')} hint={t('set.reportUpdatesHint')}
              control={<Toggle label={t('set.reportUpdates')} checked={prefs.reportUpdates} onChange={v => update('reportUpdates', v)} />} />
            <Row icon={<Eye size={16} />} label={t('set.deadlineWarnings')} hint={t('set.deadlineWarningsHint')}
              control={<Select field="deadlineWarnings" options={DEADLINE_OPTS} />} />
          </div>
        </section>

        <section className="kbt-card amw-settings-panel">
          <div className="amw-settings-panel-head">
            <span>{t('set.account')}</span>
            <strong>{t('set.privacyAccess')}</strong>
          </div>
          <div className="amw-settings-list">
            <Row icon={<LockKeyhole size={16} />} label={t('set.sessionProtection')} hint={t('set.sessionProtectionHint')}
              control={<Toggle label={t('set.sessionProtection')} checked={prefs.sessionProtection} onChange={v => update('sessionProtection', v)} />} />
            <Row icon={<ShieldCheck size={16} />} label={t('set.auditVisibility')} hint={t('set.auditVisibilityHint')}
              control={<span className="amw-settings-static">{t('set.auditVisibilityStatic')}</span>} />
            <Row icon={<Eye size={16} />} label={t('set.personalData')} hint={t('set.personalDataHint')}
              control={<Toggle label={t('set.personalData')} checked={prefs.personalDataMode} onChange={v => update('personalDataMode', v)} />} />
          </div>
        </section>
      </div>
    </div>
  )
}
