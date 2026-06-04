import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart2, CheckCircle2, ClipboardList, Plus, RefreshCw, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import { getTypeLabel } from '@/lib/utils'
import type { Evaluation } from '@/types'

interface DashboardStats {
  totalEvaluations: number
  completedEvaluations: number
  pendingEvaluations: number
  averageScore: number | null
  totalUsers: number
  activeCycles: number
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
  green: 'var(--kbt-success)',
  gold:  'var(--lambo-gold)',
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

const STATUS_LBL: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  CLOSED: 'Closed',
}

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  })

  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const recent = evaluations?.slice(0, 5) ?? []
  const completionPct = stats && stats.totalEvaluations > 0
    ? Math.round((stats.completedEvaluations / stats.totalEvaluations) * 100)
    : 0

  const metricCards: MetricCardProps[] = [
    {
      label: 'Total Evaluations',
      numericValue: stats?.totalEvaluations ?? null,
      displayValue: String(stats?.totalEvaluations ?? '-'),
      icon: <ClipboardList size={16} />,
      accent: 'blue',
      sub: 'Current evaluation pool',
      trend: null, trendUp: null,
      spark: [38, 52, 44, 70, 58, 82, 76],
    },
    {
      label: 'Completed',
      numericValue: stats?.completedEvaluations ?? null,
      displayValue: String(stats?.completedEvaluations ?? '-'),
      icon: <CheckCircle2 size={16} />,
      accent: 'green',
      sub: `${completionPct}% completion rate`,
      trend: `${completionPct}%`, trendUp: completionPct >= 50,
      spark: [28, 40, 36, 62, 54, 73, 66],
    },
    {
      label: 'Avg Score',
      numericValue: null,
      displayValue: stats?.averageScore != null ? stats.averageScore.toFixed(2) : '-',
      icon: <TrendingUp size={16} />,
      accent: 'gold',
      sub: 'Overall average',
      trend: null, trendUp: null,
      spark: [55, 62, 58, 74, 68, 76, 71],
    },
    {
      label: 'Total Users',
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
          <span className="amw-eyebrow">AMW Performance Command</span>
          <h1 style={{ fontSize: 'clamp(2rem, 3.6vw, 3.9rem)' }}>
            {greeting}, <span className="kbt-gradient-text">{user?.name}</span>
          </h1>
          <p>
            Executive cockpit for review readiness, active evaluation work, scoring coverage, and operational status.
          </p>
          <div className="amw-hero-badges">
            <span>{completionPct}% completion</span>
            <span>{stats?.activeCycles ?? 0} active cycles</span>
            <span>{stats?.pendingEvaluations ?? 0} pending</span>
          </div>
        </div>
        <div className="amw-hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(isAdmin || isManager) && (
            <Link to="/evaluations" style={{ textDecoration: 'none' }}>
              <button className="kbt-btn-primary"><Plus size={14} /> New Evaluation</button>
            </Link>
          )}
          <Link to="/reports" style={{ textDecoration: 'none' }}>
            <button className="kbt-btn-outline"><BarChart2 size={14} /> View Reports</button>
          </Link>
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
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--kbt-text-2)' }}>Overall Completion Progress</p>
            <span className="kbt-score-value kbt-counter">{completionPct}%</span>
          </div>
          <div className="kbt-progress">
            <div className="kbt-progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>{stats.completedEvaluations} completed</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>{stats.pendingEvaluations} pending</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 296px', gap: 16 }}>
        <div className="kbt-card">
          <div className="kbt-card-header">
            <span className="kbt-card-title">Recent Evaluations</span>
            <Link to="/evaluations" className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}>
              View All <ArrowUpRight size={11} />
            </Link>
          </div>
          {!recent.length ? (
            <div className="kbt-empty-panel">No evaluations yet</div>
          ) : (
            <table className="kbt-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Cycle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(ev => (
                  <tr key={ev.id} onClick={() => { window.location.href = `/evaluations/${ev.id}` }}>
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
                    <td style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem' }}>{getTypeLabel(ev.type)}</td>
                    <td><span className={STATUS_CLS[ev.status] ?? 'kbt-badge-neutral'}>{STATUS_LBL[ev.status] ?? ev.status}</span></td>
                    <td style={{ textAlign: 'right' }}>{ev.totalScore != null ? <span className="kbt-score-value">{ev.totalScore.toFixed(2)}</span> : <span style={{ color: 'var(--kbt-text-3)' }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="kbt-card">
            <div className="kbt-card-header"><span className="kbt-card-title">Quick Actions</span></div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'View My Evaluations', icon: <ClipboardList size={14} />, to: '/evaluations' },
                { label: 'Browse Templates', icon: <RefreshCw size={14} />, to: '/templates' },
                { label: 'Evaluation Cycles', icon: <RefreshCw size={14} />, to: '/cycles' },
                { label: 'View Reports', icon: <BarChart2 size={14} />, to: '/reports' },
                ...(isAdmin ? [{ label: 'User Management', icon: <Users size={14} />, to: '/users' }] : []),
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

          <div className="kbt-card">
            <div className="kbt-card-header"><span className="kbt-card-title">System Status</span></div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['API Server', 'Database', 'Auth Service'].map((label) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', fontWeight: 700 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--kbt-success)', boxShadow: '0 0 8px var(--kbt-success)', animation: 'pulseGreen 2s ease infinite' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--kbt-success)', fontWeight: 900 }}>Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
