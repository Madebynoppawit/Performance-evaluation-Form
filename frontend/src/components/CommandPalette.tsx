import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  ClipboardList,
  CornerDownLeft,
  FileJson2,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Database,
  Sun,
  UserCog,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useCommandPalette } from './commandPaletteStore'
import { useThemeMode } from '@/hooks/useThemeMode'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import type { TranslationKey } from '@/i18n/translations'

type Group = 'Navigate' | 'Actions' | 'Developer' | 'Appearance' | 'Account'

const GROUP_KEY: Record<Group, TranslationKey> = {
  Navigate: 'cmd.grp.navigate',
  Actions: 'cmd.grp.actions',
  Developer: 'cmd.grp.developer',
  Appearance: 'cmd.grp.appearance',
  Account: 'cmd.grp.account',
}

interface Command {
  id: string
  label: string
  hint?: string
  group: Group
  icon: LucideIcon
  keywords?: string
  shortcut?: string
  run: () => void
}

export default function CommandPalette() {
  const { open, setOpen, toggle } = useCommandPalette()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeMode()
  const { logout, isManager, isAdmin } = useAuth()
  const t = useT()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false)
    const goto = (to: string) => () => { close(); navigate(to) }
    const openExternal = (href: string) => () => { close(); window.open(href, '_blank', 'noopener,noreferrer') }
    const list: Command[] = [
      { id: 'nav-dashboard', label: t('nav.dashboard'), hint: t('nav.dashboard.sub'), group: 'Navigate', icon: LayoutDashboard, keywords: 'home overview dashboard', run: goto('/') },
      { id: 'nav-eval', label: t('nav.evaluations'), hint: t('nav.evaluations.sub'), group: 'Navigate', icon: ClipboardList, keywords: 'review forms evaluations', run: goto('/evaluations') },
      { id: 'nav-templates', label: t('nav.templates'), hint: t('nav.templates.sub'), group: 'Navigate', icon: LayoutTemplate, keywords: 'blueprint templates', run: goto('/templates') },
      { id: 'nav-cycles', label: t('nav.cycles'), hint: t('nav.cycles.sub'), group: 'Navigate', icon: RefreshCw, keywords: 'periods schedule cycles', run: goto('/cycles') },
      { id: 'nav-reports', label: t('nav.reports'), hint: t('nav.reports.sub'), group: 'Navigate', icon: BarChart2, keywords: 'analytics charts reports', run: goto('/reports') },
      ...(isAdmin
        ? [
            { id: 'nav-users', label: t('nav.users'), hint: t('nav.users.sub'), group: 'Navigate' as Group, icon: UserCog, keywords: 'users management accounts access people', run: goto('/users') },
            { id: 'nav-data', label: t('nav.data'), hint: t('nav.data.sub'), group: 'Navigate' as Group, icon: Database, keywords: 'data import export audit management', run: goto('/data') },
          ]
        : []),
      ...(isManager
        ? [{ id: 'act-new-eval', label: t('eval.new'), hint: t('cmd.startReview'), group: 'Actions' as Group, icon: Plus, keywords: 'create add new evaluation', run: goto('/evaluations') }]
        : []),
      ...(isAdmin
        ? [
            { id: 'act-new-tpl', label: t('tmpl.new'), hint: t('cmd.buildForm'), group: 'Actions' as Group, icon: LayoutTemplate, keywords: 'create add template form', run: goto('/templates') },
            { id: 'act-new-cycle', label: t('cyc.create'), hint: t('cmd.openPeriod'), group: 'Actions' as Group, icon: RefreshCw, keywords: 'create add cycle period', run: goto('/cycles') },
            { id: 'dev-api-docs', label: t('nav.apiDocs'), hint: t('cmd.swagger'), group: 'Developer' as Group, icon: FileJson2, keywords: 'swagger openapi api documentation developer docs', run: openExternal('/api/docs/') },
          ]
        : []),
      { id: 'act-theme', label: theme === 'dark' ? t('cmd.switchLight') : t('cmd.switchDark'), group: 'Appearance', icon: theme === 'dark' ? Sun : Moon, keywords: 'dark light mode appearance theme', shortcut: 'Ctrl+T', run: () => { toggleTheme() } },
      { id: 'nav-guide', label: t('nav.guidelines'), hint: t('cmd.guideHint'), group: 'Account', icon: BookOpen, keywords: 'help guide manual docs language thai french guide', run: goto('/guidelines') },
      { id: 'nav-account', label: t('nav.account'), hint: t('nav.account.sub'), group: 'Account', icon: UserRound, keywords: 'profile me account', run: goto('/account') },
      { id: 'nav-settings', label: t('nav.settings'), hint: t('nav.settings.sub'), group: 'Account', icon: Settings, keywords: 'preferences config settings', run: goto('/settings') },
      { id: 'act-signout', label: t('cmd.signout'), group: 'Account', icon: LogOut, keywords: 'logout exit leave sign out', run: () => { close(); logout(); navigate('/login') } },
    ]
    return list
  }, [navigate, setOpen, theme, toggleTheme, logout, isManager, isAdmin, t])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c =>
      `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''} ${c.group}`.toLowerCase().includes(q)
    )
  }, [query, commands])

  const grouped = useMemo(() => {
    const order: Group[] = ['Navigate', 'Actions', 'Developer', 'Appearance', 'Account']
    return order
      .map(g => ({ group: g, items: results.filter(r => r.group === g) }))
      .filter(g => g.items.length > 0)
  }, [results])

  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle() }
      if (mod && e.key.toLowerCase() === 't') { e.preventDefault(); toggleTheme() }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, toggleTheme, setOpen])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActive(a => Math.min(a, Math.max(flat.length - 1, 0)))
  }, [flat.length])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function onKeyDown(e: React.KeyboardEvent) {
    if (flat.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % flat.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + flat.length) % flat.length) }
    else if (e.key === 'Enter') { e.preventDefault(); flat[active]?.run() }
  }

  let runningIdx = -1

  return (
    <div className="amw-cmdk-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="amw-cmdk" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="amw-cmdk-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('cmd.placeholder')}
            aria-label="Command palette search"
          />
          <span className="kbt-kbd">ESC</span>
        </div>

        <div className="amw-cmdk-list" ref={listRef}>
          {flat.length === 0 && (
            <div className="amw-cmdk-empty">
              <Search size={20} />
              <strong>{t('cmd.noResults')}</strong>
              <span>{t('cmd.tryDifferent')}</span>
            </div>
          )}

          {grouped.map(({ group, items }) => (
            <div key={group} className="amw-cmdk-group">
              <p className="amw-cmdk-group-label">{t(GROUP_KEY[group])}</p>
              {items.map(cmd => {
                runningIdx += 1
                const idx = runningIdx
                const Icon = cmd.icon
                const isActive = idx === active
                return (
                  <button
                    key={cmd.id}
                    data-idx={idx}
                    type="button"
                    className={`amw-cmdk-item${isActive ? ' active' : ''}`}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => cmd.run()}
                  >
                    <span className="amw-cmdk-item-icon"><Icon size={16} /></span>
                    <span className="amw-cmdk-item-label">
                      {cmd.label}
                      {cmd.hint && <em>{cmd.hint}</em>}
                    </span>
                    {cmd.shortcut && <span className="kbt-kbd">{cmd.shortcut}</span>}
                    {isActive && <CornerDownLeft size={13} className="amw-cmdk-enter" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="amw-cmdk-footer">
          <span><kbd className="kbt-kbd">up</kbd><kbd className="kbt-kbd">down</kbd> {t('cmd.fNavigate')}</span>
          <span><kbd className="kbt-kbd">enter</kbd> {t('cmd.fSelect')}</span>
          <span><kbd className="kbt-kbd">esc</kbd> {t('cmd.fClose')}</span>
          <span className="amw-cmdk-brand"><ArrowRight size={11} /> AMW Command</span>
        </div>
      </div>
    </div>
  )
}
