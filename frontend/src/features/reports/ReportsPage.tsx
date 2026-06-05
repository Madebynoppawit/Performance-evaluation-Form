import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart2, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import api from '@/lib/api'
import { SkeletonReport } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import ReportsOverview from './ReportsOverview'
import { scoreTier } from '@/lib/score'
import { chartColor, chartMargin, chartStroke, chartTick } from '@/lib/chartTheme'

interface ReportSummary {
  cycleId: string
  cycleName: string
  averageScore: number
  totalEvaluations: number
  completedEvaluations: number
  byDepartment: { department: string; averageScore: number }[]
}

interface TooltipPayload {
  value?: number | string
  payload?: { department?: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

const scoreLabel = (score: number) => {
  const t = scoreTier(score)
  return { label: t.label, cls: t.cls }
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="amw-chart-tooltip">
      <p>
        {payload[0]?.payload?.department}
      </p>
      <p className="kbt-score-value">{Number(payload[0]?.value).toFixed(2)}</p>
    </div>
  )
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery<ReportSummary[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  })

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">Performance Intelligence</span>
          <h1>Reports</h1>
          <p>Analyze cycle-level scoring, completion coverage, and department performance distribution.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="amw-stack">
          <SkeletonReport /><SkeletonReport />
        </div>
      ) : !data?.length ? (
        <div className="kbt-card">
          <EmptyState
            icon={BarChart2}
            title="No report data yet"
            description="Reports appear once evaluations are assigned and scored. Open a cycle and run reviews to populate analytics."
            action={{ label: 'Go to evaluations', to: '/evaluations' }}
          />
        </div>
      ) : (
        <div className="amw-stack">
          <ReportsOverview summaries={data} />

          <div className="kbt-section-title amw-section-title-compact">Cycle Breakdown</div>

          {data.map((report) => {
            const pct = report.totalEvaluations > 0
              ? Math.round((report.completedEvaluations / report.totalEvaluations) * 100)
              : 0
            const { label, cls } = scoreLabel(report.averageScore)

            return (
              <div key={report.cycleId} className="kbt-card">
                <div className="amw-report-card-body">
                  <div className="amw-report-card-head">
                    <div>
                      <h2>{report.cycleName}</h2>
                      <div className="amw-report-badge-row"><span className={cls}>{label}</span></div>
                    </div>
                    <div className="amw-report-score">
                      <p className="kbt-score-value">{report.averageScore.toFixed(2)}</p>
                      <p>Avg Score</p>
                    </div>
                  </div>

                  <div className="kbt-metric-grid kbt-metric-grid-3 amw-report-metrics">
                    {[
                      { label: 'Total', value: report.totalEvaluations, icon: <Users size={14} color="var(--sap-blue)" /> },
                      { label: 'Completed', value: report.completedEvaluations, icon: <CheckCircle2 size={14} color="var(--m-blue)" /> },
                      { label: 'Completion', value: `${pct}%`, icon: <TrendingUp size={14} color="var(--amw-red)" /> },
                    ].map(({ label: metricLabel, value, icon }) => (
                      <div key={metricLabel} className="kbt-metric amw-report-metric">
                        <div className="kbt-metric-head amw-report-metric-head">
                          <span>{metricLabel}</span>
                          <div className="kbt-metric-icon">{icon}</div>
                        </div>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="amw-report-progress">
                    <div>
                      <span>Completion Progress</span>
                      <span className="kbt-score-value">{pct}%</span>
                    </div>
                    <div className="kbt-progress">
                      <div className="kbt-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {report.byDepartment.length > 0 && (
                    <div>
                      <p className="amw-chart-section-label">
                        Score by Department
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={report.byDepartment} margin={chartMargin.report}>
                          <CartesianGrid strokeDasharray={chartStroke.gridDash} stroke={chartColor.grid} />
                          <XAxis dataKey="department" tick={chartTick.md} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 5]} tick={chartTick.md} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: chartColor.primarySoft }} />
                          <ReferenceLine y={3} stroke={chartColor.reference} strokeDasharray={chartStroke.dash} />
                          <defs>
                            <linearGradient id={`barGradient-${report.cycleId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColor.gold} stopOpacity={0.95} />
                              <stop offset="48%" stopColor={chartColor.primary} stopOpacity={0.82} />
                              <stop offset="100%" stopColor="var(--m-blue)" stopOpacity={0.72} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="averageScore" radius={[5, 5, 0, 0]} fill={`url(#barGradient-${report.cycleId})`} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
