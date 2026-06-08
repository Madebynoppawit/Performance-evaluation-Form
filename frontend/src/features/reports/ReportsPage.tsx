import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart2, CheckCircle2, Download, KeyRound, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import api from '@/lib/api'
import { SkeletonReport } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import ReportsOverview from './ReportsOverview'
import { scoreTier } from '@/lib/score'
import { chartColor, chartMargin, chartStroke, chartTick } from '@/lib/chartTheme'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'

interface ReportSummary {
  cycleId: string
  cycleName: string
  averageScore: number
  totalEvaluations: number
  completedEvaluations: number
  byDepartment: { department: string; averageScore: number }[]
}

interface AuditEvent {
  id: string
  eventType: string
  actorRole?: string | null
  requestId?: string | null
  method?: string | null
  path?: string | null
  statusCode?: number | null
  targetType?: string | null
  targetId?: string | null
  createdAt: string
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
  const { isAdmin } = useAuth()
  const t = useT()
  const { data, isLoading } = useQuery<ReportSummary[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  })
  const { data: auditEvents, isLoading: auditLoading } = useQuery<AuditEvent[]>({
    queryKey: ['reports', 'audit-events'],
    queryFn: () => api.get('/reports/audit-events').then(r => r.data),
    enabled: isAdmin,
  })
  const exportEvents = auditEvents?.filter((event) => event.eventType.includes('export')).length ?? 0
  const failedLoginEvents = auditEvents?.filter((event) => event.eventType === 'auth_login_failed').length ?? 0
  const mutationEvents = auditEvents?.filter((event) => event.eventType === 'http_mutation').length ?? 0

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.reports.eyebrow')}</span>
          <h1>{t('page.reports.title')}</h1>
          <p>{t('page.reports.desc')}</p>
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
            title={t('rp.noData')}
            description={t('rp.noDataDesc')}
            action={{ label: t('rp.goToEval'), to: '/evaluations' }}
          />
        </div>
      ) : (
        <div className="amw-stack">
          <ReportsOverview summaries={data} />

          {isAdmin && (
            <section className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title amw-card-title-inline">
                  <ShieldCheck size={15} color="var(--sap-blue)" /> {t('rp.auditCenter')}
                </span>
                <span className="amw-card-meta">{t('rp.latest100')}</span>
              </div>
              <div className="kbt-card-body">
                <div className="kbt-metric-grid kbt-metric-grid-3">
                  {[
                    { label: t('rp.mutations'), value: mutationEvents, icon: <ShieldCheck size={14} color="var(--sap-blue)" /> },
                    { label: t('rp.exports'), value: exportEvents, icon: <Download size={14} color="var(--amw-red)" /> },
                    { label: t('rp.failedLogin'), value: failedLoginEvents, icon: <KeyRound size={14} color="var(--kbt-warning)" /> },
                  ].map((metric) => (
                    <div key={metric.label} className="kbt-metric amw-report-metric">
                      <div className="kbt-metric-head amw-report-metric-head">
                        <span>{metric.label}</span>
                        <div className="kbt-metric-icon">{metric.icon}</div>
                      </div>
                      <strong>{auditLoading ? '-' : metric.value}</strong>
                    </div>
                  ))}
                </div>

                {auditLoading ? (
                  <div className="amw-loading-panel" style={{ marginTop: 14 }}>{t('rp.loadingAudit')}</div>
                ) : !auditEvents?.length ? (
                  <EmptyState
                    compact
                    icon={ShieldCheck}
                    title={t('rp.noAudit')}
                    description={t('rp.noAuditDesc')}
                  />
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: 14 }}>
                    <table className="kbt-table">
                      <thead>
                        <tr>
                          <th>{t('rp.event')}</th>
                          <th>{t('rp.actor')}</th>
                          <th>{t('rp.target')}</th>
                          <th>{t('table.status')}</th>
                          <th>{t('rp.request')}</th>
                          <th>{t('rp.created')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditEvents.slice(0, 8).map((event) => (
                          <tr key={event.id}>
                            <td>
                              <strong>{event.eventType}</strong>
                              <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.7rem', marginTop: 2 }}>{event.method ?? '-'} {event.path ?? '-'}</p>
                            </td>
                            <td>{event.actorRole ?? t('rp.system')}</td>
                            <td>{event.targetType ? `${event.targetType}: ${event.targetId ?? '-'}` : '-'}</td>
                            <td>
                              <span className={event.statusCode && event.statusCode >= 400 ? 'kbt-badge-warning' : 'kbt-badge-success'}>
                                {event.statusCode ?? '-'}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--kbt-text-3)' }}>{event.requestId ?? '-'}</td>
                            <td>{new Date(event.createdAt).toLocaleString('en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="kbt-section-title amw-section-title-compact">{t('rp.cycleBreakdown')}</div>

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
                      <p>{t('rp.avgScore')}</p>
                    </div>
                  </div>

                  <div className="kbt-metric-grid kbt-metric-grid-3 amw-report-metrics">
                    {[
                      { label: t('rp.total'), value: report.totalEvaluations, icon: <Users size={14} color="var(--sap-blue)" /> },
                      { label: t('rp.completed'), value: report.completedEvaluations, icon: <CheckCircle2 size={14} color="var(--m-blue)" /> },
                      { label: t('rp.completion'), value: `${pct}%`, icon: <TrendingUp size={14} color="var(--amw-red)" /> },
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
                      <span>{t('rp.completionProgress')}</span>
                      <span className="kbt-score-value">{pct}%</span>
                    </div>
                    <div className="kbt-progress">
                      <div className="kbt-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {report.byDepartment.length > 0 && (
                    <div>
                      <p className="amw-chart-section-label">
                        {t('rp.scoreByDept')}
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
