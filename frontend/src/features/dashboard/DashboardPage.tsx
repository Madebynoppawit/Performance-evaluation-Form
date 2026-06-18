import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowUpRight, BarChart2, BookOpen, CalendarClock, CheckCircle2, ClipboardList, FileCheck2, Gauge, LayoutTemplate, Plus, RefreshCw, Send, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
import { usePreferences } from '@/hooks/usePreferences'
import api from '@/lib/api'
import type { Evaluation } from '@/types'
import { toGpa } from '@/lib/score'
import DashboardAnalytics from './DashboardAnalytics'
import EmptyState from '@/components/EmptyState'

interface DashboardStats {
  totalEvaluations: number
  completedEvaluations: number
  pendingEvaluations: number
  averageScore: number | null
  totalUsers: number
  activeCycles: number
}

interface HealthStatus {
  status: 'ok' | 'degraded'
  version: string
  env: string
  release?: {
    channel?: string
    aiEnabled?: boolean
    aiProvider?: string
  }
  checkedAt: string
  latencyMs: number
  requestId?: string
  services?: {
    api?: 'ok' | 'degraded'
    auth?: 'ok' | 'degraded'
    database?: 'ok' | 'degraded'
  }
}

/* ── Count-up hook ─────────────────────────────────────────────────────────── */
function useCountUp(target: number | null, duration = 950) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (target == null) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - t, 4)) * target))
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

/* ── MetricCard component ──────────────────────────────────────────────────── */
type Accent = 'blue' | 'green' | 'gold' | 'cyan'
interface MetricCardProps {
  label: string
  numericValue: number | null
  displayValue: string
  icon: ReactNode
  accent: Accent
  sub: string
  trend?: string | null
  trendUp?: boolean | null
  spark: number[]
  delay?: number
}
const ACCENT: Record<Accent, string> = {
  blue:  'var(--sap-blue)',
  green: 'var(--m-blue)',
  gold:  'var(--amw-red)',
  cyan:  'var(--kbt-cyan)',
}
function MetricCard({ label, numericValue, displayValue, icon, accent, sub, trend, trendUp, spark, delay = 0 }: MetricCardProps) {
  const counted = useCountUp(numericValue)
  const shown = numericValue != null && Number.isInteger(numericValue) ? String(counted) : displayValue
  return (
    <div className={`kbt-metric kbt-metric--${accent} kbt-animate-up`} style={{ animationDelay: `${delay}s` }}>
      <div className="kbt-metric-head">
        <span>{label}</span>
        <div className={`kbt-metric-icon kbt-metric-icon--${accent}`}>{icon}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
        <div>
          <strong style={{ color: ACCENT[accent], fontFamily: accent === 'gold' ? 'JetBrains Mono, monospace' : 'inherit' }}>
            {shown}
          </strong>
          {trend != null && trendUp != null && (
            <span className={`kbt-stat-trend kbt-stat-trend--${trendUp ? 'up' : 'down'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        <div className="kbt-sparkline" style={{ color: ACCENT[accent] }}>
          {spark.map((h, i) => (
            <div key={i} className="kbt-spark-bar" style={{ height: `${h}%`, animationDelay: `${delay + 0.28 + i * 0.05}s` }} />
          ))}
        </div>
      </div>
      <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.72rem', marginTop: 8 }}>{sub}</p>
    </div>
  )
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'kbt-badge-neutral',
  IN_PROGRESS: 'kbt-badge-warning',
  SUBMITTED: 'kbt-badge-info',
  REVIEWED: 'kbt-badge-success',
  CLOSED: 'kbt-badge-neutral',
}

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const { statusLabel, typeLabel } = useLabels()
  const { prefs } = usePreferences()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dash.morning') : hour < 17 ? t('dash.afternoon') : t('dash.evening')

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  })

  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const { data: health, isError: healthDown } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: () => api.get('/health', { validateStatus: status => status < 600 }).then(r => r.data),
    refetchInterval: 30_000,
    retry: 1,
  })

  const recent = evaluations?.slice(0, 5) ?? []
  const completionPct = stats && stats.totalEvaluations > 0
    ? Math.round((stats.completedEvaluations / stats.totalEvaluations) * 100)
    : 0
  const executiveInsights = useMemo(() => {
    const list = evaluations ?? []
    const now = Date.now()
    const open = list.filter(e => e.status !== 'REVIEWED' && e.status !== 'CLOSED')
    const stale = open.filter(e => now - new Date(e.updatedAt).getTime() > 3 * 24 * 60 * 60 * 1000)
    const activeCycles = list
      .map(e => e.cycle)
      .filter((cycle): cycle is NonNullable<Evaluation['cycle']> => !!cycle && cycle.status === 'ACTIVE')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    const deadline = activeCycles[0]
    const daysLeft = deadline
      ? Math.max(0, Math.ceil((new Date(deadline.endDate).getTime() - now) / (24 * 60 * 60 * 1000)))
      : null
    const departmentPending = open.reduce<Record<string, number>>((acc, e) => {
      const department = e.evaluatee?.department || 'Unassigned'
      acc[department] = (acc[department] ?? 0) + 1
      return acc
    }, {})
    const riskiestDepartment = Object.entries(departmentPending).sort((a, b) => b[1] - a[1])[0]

    return {
      openCount: open.length,
      staleCount: stale.length,
      deadlineName: deadline?.name ?? 'No active cycle',
      daysLeft,
      riskiestDepartment: riskiestDepartment
        ? { name: riskiestDepartment[0], count: riskiestDepartment[1] }
        : null,
    }
  }, [evaluations])

  const metricCards: MetricCardProps[] = [
    {
      label: t('dash.metric.total'),
      numericValue: stats?.totalEvaluations ?? null,
      displayValue: String(stats?.totalEvaluations ?? '-'),
      icon: <ClipboardList size={16} />,
      accent: 'blue',
      sub: 'Current evaluation pool',
      trend: null, trendUp: null,
      spark: [38, 52, 44, 70, 58, 82, 76],
    },
    {
      label: t('dash.metric.completed'),
      numericValue: stats?.completedEvaluations ?? null,
      displayValue: String(stats?.completedEvaluations ?? '-'),
      icon: <CheckCircle2 size={16} />,
      accent: 'green',
      sub: `${completionPct}% completion rate`,
      trend: `${completionPct}%`, trendUp: completionPct >= 50,
      spark: [28, 40, 36, 62, 54, 73, 66],
    },
    {
      label: t('dash.metric.avg'),
      numericValue: null,
      displayValue: stats?.averageScore != null ? toGpa(stats.averageScore).toFixed(2) : '-',
      icon: <TrendingUp size={16} />,
      accent: 'gold',
      sub: 'Overall average',
      trend: null, trendUp: null,
      spark: [55, 62, 58, 74, 68, 76, 71],
    },
    {
      label: t('dash.metric.users'),
      numericValue: stats?.totalUsers ?? null,
      displayValue: String(stats?.totalUsers ?? '-'),
      icon: <Users size={16} />,
      accent: 'cyan',
      sub: `${stats?.activeCycles ?? 0} active cycles`,
      trend: null, trendUp: null,
      spark: [75, 78, 80, 79, 84, 86, 89],
    },
  ]

  return (
    <div className="kbt-page">
      <section className="amw-studio-hero" style={{ minHeight: 188 }}>
        <div className="amw-hero-copy">
          <span className="amw-eyebrow">{t('page.dashboard.eyebrow')}</span>
          <h1 style={{ fontSize: 'clamp(2rem, 3.6vw, 3.9rem)' }}>
            {greeting}, <span className="kbt-gradient-text">{user?.name}</span>
          </h1>
          <p>
            {t('dash.heroSubtitle')}
          </p>
          <div className="amw-hero-badges">
            <span>{completionPct}% {t('dash.completion')}</span>
            <span>{stats?.activeCycles ?? 0} {t('dash.activeCycles')}</span>
            <span>{stats?.pendingEvaluations ?? 0} {t('dash.pending')}</span>
            <span>{t('dash.corporateStandard')}</span>
          </div>
        </div>
        <div className="amw-hero-actions amw-corporate-stack">
          <div className="amw-hero-intel-panel" style={{ '--pct': `${completionPct}%` } as CSSProperties}>
            <div className="amw-hero-intel-head">
              <span>{t('dash.reviewPulse')}</span>
              <strong>{healthDown ? t('dash.offline') : t('dash.live')}</strong>
            </div>
            <div className="amw-hero-intel-body">
              <div className="amw-hero-gauge">
                <Gauge size={24} />
                <strong>{completionPct}%</strong>
                <span>{t('dash.complete')}</span>
              </div>
              <div className="amw-hero-intel-list">
                <div>
                  <Activity size={14} />
                  <span>{t('dash.pendingDecisions')}</span>
                  <strong>{stats?.pendingEvaluations ?? 0}</strong>
                </div>
                <div>
                  <ShieldCheck size={14} />
                  <span>{t('dash.governanceState')}</span>
                  <strong>{t('dash.controlled')}</strong>
                </div>
                <div>
                  <TrendingUp size={14} />
                  <span>{t('dash.averageScore')}</span>
                  <strong>{stats?.averageScore != null ? toGpa(stats.averageScore).toFixed(2) : '-'}</strong>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(isAdmin || isManager) && (
              <Link to="/evaluations" style={{ textDecoration: 'none' }}>
                <button className="kbt-btn-primary"><Plus size={14} /> {t('dash.newEvaluation')}</button>
              </Link>
            )}
            <Link to="/reports" style={{ textDecoration: 'none' }}>
              <button className="kbt-btn-report"><BarChart2 size={15} /> {t('dash.viewReports')}</button>
            </Link>
          </div>
        </div>
      </section>

      <div className="kbt-metric-grid kbt-metric-grid-4">
        {metricCards.map((card, i) => (
          <MetricCard key={card.label} {...card} delay={i * 0.09} />
        ))}
      </div>

      {stats && stats.totalEvaluations > 0 && (
        <div className="kbt-card kbt-animate-up kbt-stagger-4" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--kbt-text-2)' }}>{t('dash.overallProgress')}</p>
            <span className="kbt-score-value kbt-counter">{completionPct}%</span>
          </div>
          <div className="kbt-progress">
            <div className="kbt-progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>{stats.completedEvaluations} {t('dash.completedCount')}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>{stats.pendingEvaluations} {t('dash.pendingCount')}</span>
          </div>
        </div>
      )}

      <section className="amw-exec-strip kbt-animate-up">
        {prefs.deadlineWarnings !== 'off' && (
          prefs.deadlineWarnings === 'all' ||
          (executiveInsights.daysLeft != null && executiveInsights.daysLeft <= 7)
        ) && (
          <div className="amw-exec-insight">
            <CalendarClock size={18} />
            <div>
              <span>{t('dash.cycleDeadline')}</span>
              <strong>{executiveInsights.deadlineName}</strong>
            </div>
            <em>{executiveInsights.daysLeft == null ? 'n/a' : `${executiveInsights.daysLeft}d`}</em>
          </div>
        )}
        <div className="amw-exec-insight">
          <AlertTriangle size={18} />
          <div>
            <span>{t('dash.highestRisk')}</span>
            <strong>{executiveInsights.riskiestDepartment?.name ?? t('dash.noPendingRisk')}</strong>
          </div>
          <em>{executiveInsights.riskiestDepartment?.count ?? 0}</em>
        </div>
        <div className="amw-exec-insight">
          <Activity size={18} />
          <div>
            <span>{t('dash.staleReviews')}</span>
            <strong>{t('dash.staleDesc')}</strong>
          </div>
          <em>{executiveInsights.staleCount}</em>
        </div>
        <div className="amw-exec-actions">
          <Link to="/evaluations" className="kbt-btn-outline">
            <Send size={14} /> {t('dash.reviewPending')}
          </Link>
          <Link to="/reports" className="kbt-btn-report">
            <BarChart2 size={14} /> {t('dash.boardReport')}
          </Link>
        </div>
      </section>

      {!!evaluations?.length && <DashboardAnalytics evaluations={evaluations} />}

      <div className="amw-dash-bottom">
        <div className="kbt-card">
          <div className="kbt-card-header">
            <span className="kbt-card-title">{t('dash.recent')}</span>
            <Link to="/evaluations" className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}>
              {t('common.viewAll')} <ArrowUpRight size={11} />
            </Link>
          </div>
          {!recent.length ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title={t('dash.noEvalsTitle')}
              description={t('dash.noEvalsDesc')}
              action={isAdmin || isManager ? { label: t('dash.createEval'), to: '/evaluations' } : undefined}
            />
          ) : (
            <table className="kbt-table">
              <thead>
                <tr>
                  <th>{t('table.employee')}</th>
                  <th>{t('table.cycle')}</th>
                  <th>{t('table.type')}</th>
                  <th>{t('table.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('table.score')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(ev => (
                  <tr key={ev.id} onClick={() => navigate(`/evaluations/${ev.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="amw-step-index" style={{ width: 30, height: 30, borderRadius: 8, fontSize: '0.68rem' }}>
                          {ev.evaluatee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: 'var(--kbt-text)', fontSize: '0.8125rem' }}>{ev.evaluatee?.name}</p>
                          <p style={{ fontSize: '0.6875rem', color: 'var(--kbt-text-3)' }}>{ev.evaluatee?.department}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--kbt-text-2)', fontSize: '0.8125rem' }}>{ev.cycle?.name}</td>
                    <td style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem' }}>{typeLabel(ev.type)}</td>
                    <td><span className={STATUS_CLS[ev.status] ?? 'kbt-badge-neutral'}>{statusLabel(ev.status)}</span></td>
                    <td style={{ textAlign: 'right' }}>{ev.totalScore != null ? <span className="kbt-score-value">{toGpa(ev.totalScore).toFixed(2)}</span> : <span style={{ color: 'var(--kbt-text-3)' }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="kbt-card">
            <div className="kbt-card-header"><span className="kbt-card-title">{t('dash.quickActions')}</span></div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: t('dash.viewMyEvals'), icon: <ClipboardList size={14} />, to: '/evaluations' },
                { label: t('dash.browseTemplates'), icon: <LayoutTemplate size={14} />, to: '/templates' },
                { label: t('dash.evalCycles'), icon: <RefreshCw size={14} />, to: '/cycles' },
                { label: t('dash.viewReports'), icon: <BarChart2 size={14} />, to: '/reports' },
                { label: t('dash.userGuidelines'), icon: <BookOpen size={14} />, to: '/guidelines' },
              ].map(({ label, icon, to }) => (
                <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                  <div className="kbt-action-row">
                    <div className="kbt-metric-icon">{icon}</div>
                    <span>{label}</span>
                    <ArrowUpRight size={11} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="amw-corporate-card">
            <div className="amw-corporate-card-head">
              <ShieldCheck size={17} />
              <span>{t('dash.corporateControl')}</span>
            </div>
            <div className="amw-corporate-list">
              <div>
                <ShieldCheck size={14} />
                <span>{t('dash.roleAccess')}</span>
                <strong>{t('dash.enforced')}</strong>
              </div>
              <div>
                <FileCheck2 size={14} />
                <span>{t('dash.consentWorkflow')}</span>
                <strong>{t('dash.tracked')}</strong>
              </div>
              <div>
                <ClipboardList size={14} />
                <span>{t('dash.evidenceRecord')}</span>
                <strong>{t('dash.retained')}</strong>
              </div>
            </div>
          </div>

          <div className="kbt-card">
            <div className="kbt-card-header">
              <span className="kbt-card-title">{t('dash.systemStatus')}</span>
              {health?.version && (
                <span style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                  v{health.version}
                </span>
              )}
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: t('dash.apiServer'), up: health ? !healthDown && health.services?.api === 'ok' : null },
                { label: t('dash.database'),  up: health ? !healthDown && health.services?.database === 'ok' : null },
                { label: t('dash.authService'), up: health ? !healthDown && health.services?.auth === 'ok' : null },
              ].map(({ label, up }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', fontWeight: 700 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {up === true && <><span className="kbt-dot-live" /><span style={{ fontSize: '0.6875rem', color: 'var(--m-light-blue)', fontWeight: 900 }}>{t('dash.online')}</span></>}
                    {up === false && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--kbt-error)', display: 'inline-block' }} /><span style={{ fontSize: '0.6875rem', color: 'var(--kbt-error)', fontWeight: 900 }}>{t('dash.offline')}</span></>}
                    {up == null && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--kbt-warning)', display: 'inline-block' }} /><span style={{ fontSize: '0.6875rem', color: 'var(--kbt-warning)', fontWeight: 900 }}>{t('dash.checking')}</span></>}
                  </div>
                </div>
              ))}
              <div className="amw-health-meta">
                <span>{t('dash.latency')} <strong>{health?.latencyMs ?? '-'}ms</strong></span>
                <span>{t('dash.checked')} <strong>{health?.checkedAt ? new Date(health.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></span>
                <span>Release <strong>{health?.release?.aiEnabled ? 'AI Preview' : 'Standard'}</strong></span>
              </div>
              {health?.requestId && (
                <div className="amw-health-request" title={health.requestId}>
                  req {health.requestId}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
