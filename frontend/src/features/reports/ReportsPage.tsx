import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart2, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import api from '@/lib/api'
import { SkeletonReport } from '@/components/Skeleton'

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

const scoreLabel = (score: number) =>
  score >= 4.5 ? { label: 'Role Model', cls: 'kbt-badge-success' }
  : score >= 3.5 ? { label: 'Exceeds Expectation', cls: 'kbt-badge-success' }
  : score >= 2.5 ? { label: 'Meets Expectation', cls: 'kbt-badge-info' }
  : score >= 1.5 ? { label: 'Needs Improvement', cls: 'kbt-badge-warning' }
  : { label: 'Unsatisfactory', cls: 'kbt-badge-error' }

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,16,30,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(10,110,209,0.28)', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 24px rgba(10,110,209,0.12)',
    }}>
      <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {payload[0]?.payload?.department}
      </p>
      <p className="kbt-score-value" style={{ fontSize: '1.1rem' }}>{Number(payload[0]?.value).toFixed(2)}</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonReport /><SkeletonReport />
        </div>
      ) : !data?.length ? (
        <div className="kbt-card">
          <div className="kbt-empty-panel">
            <BarChart2 size={28} />
            <strong>No report data yet</strong>
            <span>Reports will appear after evaluations are assigned and scored.</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((report) => {
            const pct = report.totalEvaluations > 0
              ? Math.round((report.completedEvaluations / report.totalEvaluations) * 100)
              : 0
            const { label, cls } = scoreLabel(report.averageScore)

            return (
              <div key={report.cycleId} className="kbt-card">
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: '1.08rem', fontWeight: 900, color: 'var(--kbt-text)' }}>{report.cycleName}</h2>
                      <div style={{ marginTop: 7 }}><span className={cls}>{label}</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="kbt-score-value" style={{ fontSize: '2.4rem', lineHeight: 1 }}>{report.averageScore.toFixed(2)}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 }}>Avg Score</p>
                    </div>
                  </div>

                  <div className="kbt-metric-grid kbt-metric-grid-3" style={{ marginBottom: 20 }}>
                    {[
                      { label: 'Total', value: report.totalEvaluations, icon: <Users size={14} color="var(--sap-blue)" /> },
                      { label: 'Completed', value: report.completedEvaluations, icon: <CheckCircle2 size={14} color="var(--m-blue)" /> },
                      { label: 'Completion', value: `${pct}%`, icon: <TrendingUp size={14} color="var(--amw-red)" /> },
                    ].map(({ label: metricLabel, value, icon }) => (
                      <div key={metricLabel} className="kbt-metric" style={{ padding: 14 }}>
                        <div className="kbt-metric-head" style={{ marginBottom: 8 }}>
                          <span>{metricLabel}</span>
                          <div className="kbt-metric-icon">{icon}</div>
                        </div>
                        <strong style={{ fontSize: '1.35rem', fontFamily: 'JetBrains Mono, monospace' }}>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-2)', fontWeight: 800 }}>Completion Progress</span>
                      <span className="kbt-score-value">{pct}%</span>
                    </div>
                    <div className="kbt-progress">
                      <div className="kbt-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {report.byDepartment.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        Score by Department
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={report.byDepartment} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(137,145,154,0.18)" />
                          <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--kbt-text-3)' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,110,209,0.06)' }} />
                          <ReferenceLine y={3} stroke="rgba(129,196,255,0.45)" strokeDasharray="3 3" />
                          <defs>
                            <linearGradient id={`barGradient-${report.cycleId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f9ce5c" stopOpacity={0.95} />
                              <stop offset="48%" stopColor="#0a6ed1" stopOpacity={0.82} />
                              <stop offset="100%" stopColor="#16588e" stopOpacity={0.72} />
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
