import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, Users, CheckCircle2, BarChart2 } from 'lucide-react'
import api from '@/lib/api'

interface ReportSummary {
  cycleId: string; cycleName: string; averageScore: number;
  totalEvaluations: number; completedEvaluations: number;
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

const scoreLabel = (s: number) =>
  s >= 4.5 ? { label: 'Role Model',           cls: 'kbt-badge-success' }
  : s >= 3.5 ? { label: 'Exceeds Expectation', cls: 'kbt-badge-success' }
  : s >= 2.5 ? { label: 'Meets Expectation',   cls: 'kbt-badge-info'    }
  : s >= 1.5 ? { label: 'Needs Improvement',   cls: 'kbt-badge-warning' }
  :            { label: 'Unsatisfactory',       cls: 'kbt-badge-error'   }

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{payload[0]?.payload?.department}</p>
      <p style={{ color: '#00c87a', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>
        {Number(payload[0]?.value).toFixed(2)}
      </p>
    </div>
  )
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery<ReportSummary[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Reports</h1>
        <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 3 }}>รายงานสรุปผลการประเมิน</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#4b5563' }}>Loading...</div>
      ) : !data?.length ? (
        <div className="kbt-card" style={{ padding: 60, textAlign: 'center' }}>
          <BarChart2 size={40} color="#4b5563" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#4b5563' }}>ยังไม่มีข้อมูลรายงาน</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((report) => {
            const pct = report.totalEvaluations > 0
              ? Math.round((report.completedEvaluations / report.totalEvaluations) * 100) : 0
            const { label, cls } = scoreLabel(report.averageScore)

            return (
              <div key={report.cycleId} className="kbt-card">
                {/* Gradient top bar */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, #00c87a, #3b82f6)' }} />

                <div style={{ padding: 20 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#e2e8f0' }}>{report.cycleName}</h2>
                      <div style={{ marginTop: 6 }}>
                        <span className={cls}>{label}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        fontSize: '2.5rem', fontWeight: 800, lineHeight: 1,
                        fontFamily: 'JetBrains Mono, monospace',
                        background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        {report.averageScore.toFixed(2)}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Score</p>
                    </div>
                  </div>

                  {/* KPI metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Total', value: report.totalEvaluations, icon: <Users size={14} color="#3b82f6" />, color: '#3b82f6' },
                      { label: 'Completed', value: report.completedEvaluations, icon: <CheckCircle2 size={14} color="#22c55e" />, color: '#22c55e' },
                      { label: 'Completion', value: `${pct}%`, icon: <TrendingUp size={14} color="#00c87a" />, color: '#00c87a' },
                    ].map(({ label, value, icon, color }) => (
                      <div key={label} style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 8, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          {icon}
                          <span style={{ fontSize: '0.6875rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                            {label}
                          </span>
                        </div>
                        <p style={{ fontSize: '1.375rem', fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>Completion Progress</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#00c87a', fontFamily: 'monospace' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'linear-gradient(90deg, #00c87a, #3b82f6)',
                        borderRadius: 2, transition: 'width 0.8s ease',
                        boxShadow: '0 0 8px rgba(0,200,122,0.4)',
                      }} />
                    </div>
                  </div>

                  {/* Chart */}
                  {report.byDepartment.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        Score by Department
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={report.byDepartment} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,200,122,0.04)' }} />
                          <ReferenceLine y={3} stroke="rgba(245,158,11,0.3)" strokeDasharray="3 3" />
                          <Bar dataKey="averageScore" radius={[4, 4, 0, 0]}
                            fill="url(#barGradient)" />
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00c87a" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                            </linearGradient>
                          </defs>
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
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
