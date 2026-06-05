import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, Building2, CheckCircle2, Gauge, TrendingDown, TrendingUp, Users } from 'lucide-react'
import api from '@/lib/api'
import type { Evaluation } from '@/types'
import { scoreTier } from '@/lib/score'
import { chartColor, chartMotion, performerTone } from '@/lib/chartTheme'

interface ReportSummary {
  totalEvaluations: number
  completedEvaluations: number
}

interface Props {
  summaries: ReportSummary[]
}

const medal = [chartColor.gold, chartColor.silver, chartColor.bronze]

function Gauge100({ pct }: { pct: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="amw-gauge">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--kbt-border)" strokeWidth="9" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={chartMotion}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--m-light-blue)" />
            <stop offset="60%" stopColor="var(--sap-blue)" />
            <stop offset="100%" stopColor={chartColor.successStrong} />
          </linearGradient>
        </defs>
      </svg>
      <div className="amw-gauge-center">
        <strong>{pct}<span>%</span></strong>
        <span>complete</span>
      </div>
    </div>
  )
}

export default function ReportsOverview({ summaries }: Props) {
  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const scored = useMemo(() => (evaluations ?? []).filter(e => e.totalScore != null), [evaluations])

  const totalReviews = summaries.reduce((s, x) => s + x.totalEvaluations, 0)
  const completed = summaries.reduce((s, x) => s + x.completedEvaluations, 0)
  const completionPct = totalReviews ? Math.round((completed / totalReviews) * 100) : 0
  const avgScore = scored.length ? scored.reduce((s, e) => s + e.totalScore!, 0) / scored.length : 0

  const departments = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    scored.forEach(e => {
      const d = e.evaluatee?.department || 'Unassigned'
      const cur = map.get(d) ?? { total: 0, count: 0 }
      cur.total += e.totalScore!
      cur.count += 1
      map.set(d, cur)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, avg: v.total / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)
  }, [scored])

  const ranked = useMemo(
    () => [...scored].sort((a, b) => b.totalScore! - a.totalScore!),
    [scored]
  )
  const top = ranked.slice(0, 5)
  const attention = ranked.slice(-5).reverse().filter(e => !top.includes(e))

  const kpis = [
    { label: 'Overall Avg Score', value: avgScore ? avgScore.toFixed(2) : '—', icon: Gauge, color: 'var(--lambo-gold)', mono: true },
    { label: 'Total Reviews', value: String(totalReviews), icon: Users, color: 'var(--sap-blue)' },
    { label: 'Completed', value: String(completed), icon: CheckCircle2, color: 'var(--kbt-success)' },
    { label: 'Departments', value: String(departments.length), icon: Building2, color: 'var(--m-light-blue)' },
  ]

  if (!scored.length && !totalReviews) return null

  return (
    <div className="amw-reports-overview kbt-animate-up">
      {/* KPI band + gauge */}
      <div className="amw-reports-hero kbt-card">
        <div className="amw-reports-kpis">
          {kpis.map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="amw-reports-kpi">
                <div className="amw-reports-kpi-icon" style={{ color: k.color }}><Icon size={17} /></div>
                <div>
                  <span>{k.label}</span>
                  <strong style={{ color: k.color, fontFamily: k.mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{k.value}</strong>
                </div>
              </div>
            )
          })}
        </div>
        <div className="amw-reports-gauge-wrap">
          <Gauge100 pct={completionPct} />
          <p>{completed} of {totalReviews} reviews submitted</p>
        </div>
      </div>

      <div className="amw-reports-split">
        {/* Department leaderboard */}
        <div className="kbt-card">
          <div className="kbt-card-header">
            <span className="kbt-card-title amw-card-title-inline">
              <Award size={15} color={chartColor.gold} /> Department Leaderboard
            </span>
            <span className="amw-card-meta">avg score</span>
          </div>
          <div className="amw-leaderboard">
            {departments.length ? departments.map((d, i) => (
              <div key={d.name} className="amw-leader-row">
                <span className="amw-leader-rank" style={{ background: i < 3 ? medal[i] : 'var(--control-bg)', color: i < 3 ? chartColor.ink : chartColor.textMuted }}>
                  {i + 1}
                </span>
                <div className="amw-leader-body">
                  <div className="amw-leader-top">
                    <strong>{d.name}</strong>
                    <span className="kbt-score-value">{d.avg.toFixed(2)}</span>
                  </div>
                  <div className="amw-leader-track">
                    <div className="amw-leader-fill" style={{ width: `${(d.avg / 5) * 100}%`, background: scoreTier(d.avg).color }} />
                  </div>
                  <span className="amw-leader-count">{d.count} scored</span>
                </div>
              </div>
            )) : <div className="amw-analytics-empty"><Building2 size={20} /><span>No scored evaluations yet</span></div>}
          </div>
        </div>

        {/* Performers */}
        <div className="kbt-card">
          <div className="kbt-card-header">
            <span className="kbt-card-title amw-card-title-inline">
              <TrendingUp size={15} color={chartColor.success} /> Performers
            </span>
          </div>
          <div className="amw-performers">
            {top.length > 0 && (
              <>
                <p className="amw-performers-label"><TrendingUp size={12} color={chartColor.success} /> Top performers</p>
                {top.map(e => (
                  <div key={e.id} className="amw-performer-row">
                    <span className="amw-performer-avatar" style={{ background: performerTone.top }}>{e.evaluatee?.name?.charAt(0) ?? '?'}</span>
                    <div>
                      <strong>{e.evaluatee?.name ?? 'Unknown'}</strong>
                      <span>{e.evaluatee?.department ?? '—'}</span>
                    </div>
                    <span className="kbt-score-value">{e.totalScore!.toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            {attention.length > 0 && (
              <>
                <p className="amw-performers-label amw-performers-label-spaced"><TrendingDown size={12} color={chartColor.warning} /> Needs attention</p>
                {attention.map(e => (
                  <div key={e.id} className="amw-performer-row">
                    <span className="amw-performer-avatar" style={{ background: performerTone.attention }}>{e.evaluatee?.name?.charAt(0) ?? '?'}</span>
                    <div>
                      <strong>{e.evaluatee?.name ?? 'Unknown'}</strong>
                      <span>{e.evaluatee?.department ?? '—'}</span>
                    </div>
                    <span className="kbt-score-value">{e.totalScore!.toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            {!scored.length && <div className="amw-analytics-empty"><Award size={20} /><span>No scored evaluations yet</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
