import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  ClipboardList,
  CornerDownLeft,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useCommandPalette } from './commandPaletteStore'
import { useThemeMode } from '@/hooks/useThemeMode'
import { useAuth } from '@/hooks/useAuth'

type Group = 'Navigate' | 'Actions' | 'Appearance' | 'Account'

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

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false)
    const goto = (to: string) => () => { close(); navigate(to) }
    const list: Command[] = [
      { id: 'nav-dashboard', label: 'Dashboard', hint: 'Overview cockpit', group: 'Navigate', icon: LayoutDashboard, keywords: 'home overview', run: goto('/') },
      { id: 'nav-eval', label: 'Evaluations', hint: 'Review workflow', group: 'Navigate', icon: ClipboardList, keywords: 'review forms', run: goto('/evaluations') },
      { id: 'nav-templates', label: 'Templates', hint: 'Form builder', group: 'Navigate', icon: LayoutTemplate, keywords: 'blueprint', run: goto('/templates') },
      { id: 'nav-cycles', label: 'Cycles', hint: 'Review periods', group: 'Navigate', icon: RefreshCw, keywords: 'periods schedule', run: goto('/cycles') },
      { id: 'nav-reports', label: 'Reports', hint: 'Performance BI', group: 'Navigate', icon: BarChart2, keywords: 'analytics charts', run: goto('/reports') },
      ...(isManager
        ? [{ id: 'act-new-eval', label: 'New Evaluation', hint: 'Start a review', group: 'Actions' as Group, icon: Plus, keywords: 'create add new evaluation', run: goto('/evaluations') }]
        : []),
      ...(isAdmin
        ? [
            { id: 'act-new-tpl', label: 'New Template', hint: 'Build a review form', group: 'Actions' as Group, icon: LayoutTemplate, keywords: 'create add template form', run: goto('/templates') },
            { id: 'act-new-cycle', label: 'New Cycle', hint: 'Open a review period', group: 'Actions' as Group, icon: RefreshCw, keywords: 'create add cycle period', run: goto('/cycles') },
          ]
        : []),
      { id: 'act-theme', label: theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme', group: 'Appearance', icon: theme === 'dark' ? Sun : Moon, keywords: 'dark light mode appearance', shortcut: 'Ctrl+T', run: () => { toggleTheme() } },
      { id: 'nav-guide', label: 'Guidelines', hint: 'TH / EN / FR user guide', group: 'Account', icon: BookOpen, keywords: 'help guide manual docs language thai french guide', run: goto('/guidelines') },
      { id: 'nav-account', label: 'Account', hint: 'User access', group: 'Account', icon: UserRound, keywords: 'profile me', run: goto('/account') },
      { id: 'nav-settings', label: 'Settings', hint: 'Preferences', group: 'Account', icon: Settings, keywords: 'preferences config', run: goto('/settings') },
      { id: 'act-signout', label: 'Sign out', group: 'Account', icon: LogOut, keywords: 'logout exit leave', run: () => { close(); logout(); navigate('/login') } },
    ]
    return list
  }, [navigate, setOpen, theme, toggleTheme, logout, isManager, isAdmin])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c =>
      `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''} ${c.group}`.toLowerCase().includes(q)
    )
  }, [query, commands])

  const grouped = useMemo(() => {
    const order: Group[] = ['Navigate', 'Actions', 'Appearance', 'Account']
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
            placeholder="Type a command or search..."
            aria-label="Command palette search"
          />
          <span className="kbt-kbd">ESC</span>
        </div>

        <div className="amw-cmdk-list" ref={listRef}>
          {flat.length === 0 && (
            <div className="amw-cmdk-empty">
              <Search size={20} />
              <strong>No commands found</strong>
              <span>Try a different search term.</span>
            </div>
          )}

          {grouped.map(({ group, items }) => (
            <div key={group} className="amw-cmdk-group">
              <p className="amw-cmdk-group-label">{group}</p>
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
          <span><kbd className="kbt-kbd">up</kbd><kbd className="kbt-kbd">down</kbd> navigate</span>
          <span><kbd className="kbt-kbd">enter</kbd> select</span>
          <span><kbd className="kbt-kbd">esc</kbd> close</span>
          <span className="amw-cmdk-brand"><ArrowRight size={11} /> AMW Command</span>
        </div>
      </div>
    </div>
  )
}
