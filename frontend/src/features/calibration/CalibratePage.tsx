import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toGpa } from '@/lib/score'
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Gauge,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@/lib/api'
import EmptyState from '@/components/EmptyState'
import Spinner from '@/components/Spinner'
import type { Evaluation } from '@/types'
import { chartColor, chartMargin, chartStroke, chartTick } from '@/lib/chartTheme'

type BandKey = 'top' | 'strong' | 'solid' | 'watch' | 'risk'

interface Band {
  key: BandKey
  label: string
  range: string
  min: number
  max: number
  color: string
}

const BANDS: Band[] = [
  { key: 'top', label: 'Exceptional', range: '4.50-5.00', min: 4.5, max: 5.01, color: '#1f3961' },
  { key: 'strong', label: 'Strong', range: '4.00-4.49', min: 4, max: 4.5, color: '#2e63a6' },
  { key: 'solid', label: 'Solid', range: '3.00-3.99', min: 3, max: 4, color: '#5c5690' },
  { key: 'watch', label: 'Watch', range: '2.00-2.99', min: 2, max: 3, color: '#d17306' },
  { key: 'risk', label: 'Risk', range: '1.00-1.99', min: 1, max: 2, color: '#e52321' },
]

const CLOSED_STATUSES = new Set(['SUBMITTED', 'REVIEWED', 'CLOSED', 'PENDING_REVIEW'])

function scoreText(value?: number | null) {
  return value == null ? '-' : value.toFixed(2)
}

function departmentOf(ev: Evaluation) {
  return ev.evaluatee?.department || 'Unassigned'
}

export default function CalibratePage() {
  const { data: evaluations = [], isLoading } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', 'calibration'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const scored = useMemo(
    () => evaluations.filter(ev => ev.totalScore != null) as Array<Evaluation & { totalScore: number }>,
    [evaluations],
  )

  const stats = useMemo(() => {
    const avg = scored.length ? scored.reduce((sum, ev) => sum + ev.totalScore, 0) / scored.length : null
    const sorted = [...scored].sort((a, b) => a.totalScore - b.totalScore)
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)].totalScore : null
    const high = scored.filter(ev => ev.totalScore >= 4.5).length
    const low = scored.filter(ev => ev.totalScore < 3).length
    const closed = scored.filter(ev => CLOSED_STATUSES.has(ev.status)).length
    return { avg, median, high, low, closed }
  }, [scored])

  const bandRows = useMemo(() => BANDS.map(band => {
    const count = scored.filter(ev => ev.totalScore >= band.min && ev.totalScore < band.max).length
    return {
      ...band,
      count,
      percent: scored.length ? Math.round((count / scored.length) * 100) : 0,
    }
  }), [scored])

  const departmentRows = useMemo(() => {
    const groups = new Map<string, Array<Evaluation & { totalScore: number }>>()
    scored.forEach(ev => {
      const dept = departmentOf(ev)
      groups.set(dept, [...(groups.get(dept) ?? []), ev])
    })
    return Array.from(groups.entries()).map(([department, rows]) => {
      const avg = rows.reduce((sum, ev) => sum + ev.totalScore, 0) / rows.length
      const min = Math.min(...rows.map(ev => ev.totalScore))
      const max = Math.max(...rows.map(ev => ev.totalScore))
      return { department, count: rows.length, averageScore: avg, spread: max - min }
    }).sort((a, b) => b.spread - a.spread || b.averageScore - a.averageScore)
  }, [scored])

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">Analytics</span>
          <h1>Calibrate</h1>
          <p>Score distribution, outliers, and department spread across all evaluated employees.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="amw-loading-panel"><Spinner size={18} /> Loading calibration workspace...</div>
      ) : scored.length === 0 ? (
        <div className="kbt-card">
          <EmptyState
            icon={Gauge}
            title="No scored evaluations yet"
            description="Complete or save evaluation scores first, then return here to calibrate the rating distribution."
            action={{ label: 'Go to evaluations', to: '/evaluations' }}
          />
        </div>
      ) : (
        <div className="amw-stack">
          <section className="kbt-card" style={{ padding: 18 }}>
            <div className="kbt-metric-grid kbt-metric-grid-4">
              {[
                { label: 'Average score', value: scoreText(stats.avg), icon: <Gauge size={14} color="var(--sap-blue)" /> },
                { label: 'Median', value: scoreText(stats.median), icon: <SlidersHorizontal size={14} color="var(--m-blue)" /> },
                { label: 'Top band', value: stats.high, icon: <TrendingUp size={14} color="var(--amw-red)" /> },
                { label: 'Closed / scored', value: `${stats.closed}/${scored.length}`, icon: <ClipboardCheck size={14} color="var(--m-light-blue)" /> },
              ].map(metric => (
                <div key={metric.label} className="kbt-metric amw-report-metric">
                  <div className="kbt-metric-head amw-report-metric-head">
                    <span>{metric.label}</span>
                    <div className="kbt-metric-icon">{metric.icon}</div>
                  </div>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
            <section className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title amw-card-title-inline">
                  <BarChart3 size={15} color="var(--sap-blue)" /> Score distribution
                </span>
                <span className="amw-card-meta">Bands are recalculated from live evaluation totals</span>
              </div>
              <div className="kbt-card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bandRows} margin={chartMargin.report}>
                    <CartesianGrid strokeDasharray={chartStroke.gridDash} stroke={chartColor.grid} />
                    <XAxis dataKey="label" tick={chartTick.md} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={chartTick.md} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: chartColor.primarySoft }}
                      content={({ active, payload }) => active && payload?.length ? (
                        <div className="amw-chart-tooltip">
                          <p>{payload[0].payload.label} ({payload[0].payload.range})</p>
                          <p className="kbt-score-value">{payload[0].payload.count} people</p>
                        </div>
                      ) : null}
                    />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {bandRows.map(row => <Cell key={row.key} fill={row.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title amw-card-title-inline">
                  <AlertTriangle size={15} color="var(--amw-red)" /> Calibration alerts
                </span>
              </div>
              <div className="kbt-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Exceptional concentration', value: `${bandRows.find(b => b.key === 'top')?.percent ?? 0}%`, warn: (bandRows.find(b => b.key === 'top')?.percent ?? 0) > 20 },
                  { label: 'Below-standard population', value: `${Math.round((stats.low / scored.length) * 100)}%`, warn: stats.low > 0 },
                  { label: 'Largest department spread', value: departmentRows[0] ? `${departmentRows[0].department} (${departmentRows[0].spread.toFixed(2)})` : '-' , warn: (departmentRows[0]?.spread ?? 0) >= 1.5 },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--kbt-border)', background: item.warn ? 'rgba(229,35,33,0.06)' : 'var(--control-bg)' }}>
                    <span style={{ color: 'var(--kbt-text-2)', fontSize: '0.8rem', fontWeight: 700 }}>{item.label}</span>
                    <strong style={{ color: item.warn ? 'var(--amw-red)' : 'var(--m-light-blue)', fontSize: '0.82rem' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="kbt-card">
            <div className="kbt-card-header">
              <span className="kbt-card-title amw-card-title-inline">
                <SlidersHorizontal size={15} color="var(--sap-blue)" /> Department calibration
              </span>
              <span className="amw-card-meta">Sorted by score spread</span>
            </div>
            <div className="kbt-card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentRows.slice(0, 8).map(d => ({ ...d, averageScore: toGpa(d.averageScore) }))} margin={chartMargin.report}>
                  <CartesianGrid strokeDasharray={chartStroke.gridDash} stroke={chartColor.grid} />
                  <XAxis dataKey="department" tick={chartTick.md} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 4]} tick={chartTick.md} axisLine={false} tickLine={false} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? (
                    <div className="amw-chart-tooltip">
                      <p>{payload[0].payload.department}</p>
                      <p>Average <span className="kbt-score-value">{payload[0].payload.averageScore.toFixed(2)}</span></p>
                      <p>Spread {payload[0].payload.spread.toFixed(2)} / {payload[0].payload.count} records</p>
                    </div>
                  ) : null} />
                  <ReferenceLine y={stats.avg ? toGpa(stats.avg) : 0} stroke={chartColor.reference} strokeDasharray={chartStroke.dash} />
                  <Bar dataKey="averageScore" radius={[5, 5, 0, 0]} fill={chartColor.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
