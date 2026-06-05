import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3, TrendingUp } from 'lucide-react'
import type { Evaluation } from '@/types'
import { SCORE_TIERS } from '@/lib/score'

interface Props {
  evaluations: Evaluation[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:       { label: 'Draft',       color: 'rgba(168,183,204,0.5)' },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b' },
  SUBMITTED:   { label: 'Submitted',   color: '#0a6ed1' },
  REVIEWED:    { label: 'Reviewed',    color: '#22c55e' },
  CLOSED:      { label: 'Closed',      color: '#81c4ff' },
}

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,16,30,0.92)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(10,110,209,0.28)', borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.68rem', fontWeight: 700, marginBottom: 3 }}>{label}</p>
      <p className="kbt-score-value" style={{ fontSize: '1rem' }}>{Number(payload[0].value).toFixed(suffix === 'count' ? 0 : 2)}{suffix === 'count' ? '' : ''}</p>
    </div>
  )
}

export default function DashboardAnalytics({ evaluations }: Props) {
  const scored = useMemo(
    () => evaluations.filter(e => e.totalScore != null)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()),
    [evaluations]
  )

  const trend = useMemo(
    () => scored.slice(-12).map((e, i) => ({
      name: e.evaluatee?.name?.split(' ')[0]?.slice(0, 6) ?? `#${i + 1}`,
      score: Number(e.totalScore!.toFixed(2)),
    })),
    [scored]
  )

  const avg = scored.length
    ? scored.reduce((s, e) => s + e.totalScore!, 0) / scored.length
    : 0

  const distribution = useMemo(
    () => SCORE_TIERS.map(t => ({
      key: t.range,
      color: t.color,
      count: scored.filter(e => e.totalScore! >= t.min && e.totalScore! < t.max).length,
    })),
    [scored]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    evaluations.forEach(e => { counts[e.status] = (counts[e.status] ?? 0) + 1 })
    return Object.keys(STATUS_META)
      .map(k => ({ key: k, ...STATUS_META[k], count: counts[k] ?? 0 }))
      .filter(s => s.count > 0)
  }, [evaluations])

  const totalForBar = statusCounts.reduce((s, x) => s + x.count, 0) || 1

  return (
    <div className="amw-analytics-grid kbt-animate-up">
      {/* Score trend */}
      <div className="kbt-card">
        <div className="kbt-card-header">
          <span className="kbt-card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={15} color="var(--sap-blue)" /> Score Trend
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--kbt-text-3)', fontWeight: 700 }}>
            avg <span className="kbt-score-value">{avg ? avg.toFixed(2) : '—'}</span>
          </span>
        </div>
        <div style={{ padding: '14px 12px 6px' }}>
          {trend.length >= 2 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={trend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0a6ed1" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#0a6ed1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(10,110,209,0.3)', strokeWidth: 1 }} />
                <ReferenceLine y={avg} stroke="rgba(216,160,22,0.5)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="score" stroke="#0a6ed1" strokeWidth={2.4} fill="url(#trendFill)" dot={{ r: 2.5, fill: '#0a6ed1' }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="amw-analytics-empty"><Activity size={22} /><span>Not enough scored evaluations yet</span></div>
          )}
        </div>
      </div>

      {/* Score distribution */}
      <div className="kbt-card">
        <div className="kbt-card-header">
          <span className="kbt-card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 size={15} color="var(--m-light-blue)" /> Score Distribution
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--kbt-text-3)', fontWeight: 700 }}>{scored.length} scored</span>
        </div>
        <div style={{ padding: '14px 12px 6px' }}>
          {scored.length >= 1 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={distribution} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="key" tick={{ fontSize: 9, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix="count" />} cursor={{ fill: 'rgba(10,110,209,0.06)' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {distribution.map(b => <Cell key={b.key} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="amw-analytics-empty"><BarChart3 size={22} /><span>No scored evaluations yet</span></div>
          )}
        </div>
      </div>

      {/* Status breakdown — full width strip */}
      <div className="kbt-card amw-analytics-status">
        <div className="kbt-card-header">
          <span className="kbt-card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Activity size={15} color="var(--kbt-success)" /> Workflow Status
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--kbt-text-3)', fontWeight: 700 }}>{evaluations.length} total</span>
        </div>
        <div style={{ padding: 16 }}>
          {statusCounts.length ? (
            <>
              <div className="amw-status-bar">
                {statusCounts.map(s => (
                  <div key={s.key} title={`${s.label}: ${s.count}`} style={{ width: `${(s.count / totalForBar) * 100}%`, background: s.color }} />
                ))}
              </div>
              <div className="amw-status-legend">
                {statusCounts.map(s => (
                  <div key={s.key}>
                    <span style={{ background: s.color }} />
                    {s.label}
                    <strong>{s.count}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="amw-analytics-empty"><Activity size={22} /><span>No evaluations yet</span></div>
          )}
        </div>
      </div>
    </div>
  )
}
