import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3, TrendingUp } from 'lucide-react'
import type { Evaluation } from '@/types'
import { SCORE_TIERS } from '@/lib/score'
import { chartColor, chartMargin, chartStroke, chartTick, statusTone } from '@/lib/chartTheme'

interface Props {
  evaluations: Evaluation[]
}

const STATUS_KEYS = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'CLOSED'] as const

interface ChartTooltipProps {
  active?: boolean
  payload?: { value: number | string }[]
  label?: string
  suffix?: 'count'
}

function ChartTooltip({ active, payload, label, suffix }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="amw-chart-tooltip">
      <p>{label}</p>
      <p className="kbt-score-value">{Number(payload[0].value).toFixed(suffix === 'count' ? 0 : 2)}</p>
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
    return STATUS_KEYS
      .map(k => ({ key: k, ...statusTone[k], count: counts[k] ?? 0 }))
      .filter(s => s.count > 0)
  }, [evaluations])

  const totalForBar = statusCounts.reduce((s, x) => s + x.count, 0) || 1

  return (
    <div className="amw-analytics-grid kbt-animate-up">
      {/* Score trend */}
      <div className="kbt-card">
        <div className="kbt-card-header">
          <span className="kbt-card-title amw-card-title-inline">
            <TrendingUp size={15} color={chartColor.primary} /> Score Trend
          </span>
          <span className="amw-card-meta">
            avg <span className="kbt-score-value">{avg ? avg.toFixed(2) : '—'}</span>
          </span>
        </div>
        <div className="amw-chart-frame">
          {trend.length >= 2 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={trend} margin={chartMargin.compact}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={chartColor.primary} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={chartColor.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={chartTick.sm} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={chartTick.sm} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartColor.primaryCursor, strokeWidth: 1 }} />
                <ReferenceLine y={avg} stroke={chartColor.benchmark} strokeDasharray={chartStroke.dash} />
                <Area type="monotone" dataKey="score" stroke={chartColor.primary} strokeWidth={2.4} fill="url(#trendFill)" dot={{ r: 2.5, fill: chartColor.primary }} activeDot={{ r: 4 }} />
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
          <span className="kbt-card-title amw-card-title-inline">
            <BarChart3 size={15} color="var(--m-light-blue)" /> Score Distribution
          </span>
          <span className="amw-card-meta">{scored.length} scored</span>
        </div>
        <div className="amw-chart-frame">
          {scored.length >= 1 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={distribution} margin={chartMargin.compact}>
                <XAxis dataKey="key" tick={{ ...chartTick.sm, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTick.sm} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix="count" />} cursor={{ fill: chartColor.primarySoft }} />
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
          <span className="kbt-card-title amw-card-title-inline">
            <Activity size={15} color={chartColor.success} /> Workflow Status
          </span>
          <span className="amw-card-meta">{evaluations.length} total</span>
        </div>
        <div className="amw-card-body">
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
