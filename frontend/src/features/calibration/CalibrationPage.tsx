import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react'
import api from '@/lib/api'
import EmptyState from '@/components/EmptyState'
import Spinner from '@/components/Spinner'
import type { Evaluation } from '@/types'
import { useLabels } from '@/i18n/useLabels'
import { useT } from '@/i18n/languageContext'

type BandKey = 'top' | 'strong' | 'solid' | 'watch' | 'risk'
type PerformanceGrade = 'EXCELLENT' | 'ABOVE_STANDARD' | 'MEETS_STANDARD' | 'ALMOST_STANDARD' | 'BELOW_STANDARD'

const BANDS = [
  { key: 'top' as BandKey,    label: 'Exceptional',     min: 4.5, max: 5.01, color: '#1f3961', autoGrade: 'EXCELLENT' as PerformanceGrade },
  { key: 'strong' as BandKey, label: 'Strong',           min: 4,   max: 4.5,  color: '#2e63a6', autoGrade: 'ABOVE_STANDARD' as PerformanceGrade },
  { key: 'solid' as BandKey,  label: 'Solid',            min: 3,   max: 4,    color: '#5c5690', autoGrade: 'MEETS_STANDARD' as PerformanceGrade },
  { key: 'watch' as BandKey,  label: 'Watch',            min: 2,   max: 3,    color: '#d17306', autoGrade: 'ALMOST_STANDARD' as PerformanceGrade },
  { key: 'risk' as BandKey,   label: 'Risk',             min: 1,   max: 2,    color: '#e52321', autoGrade: 'BELOW_STANDARD' as PerformanceGrade },
]

const GRADE_OPTIONS: { value: PerformanceGrade; label: string; color: string }[] = [
  { value: 'EXCELLENT',       label: 'Excellent',              color: '#1f3961' },
  { value: 'ABOVE_STANDARD',  label: 'Above Standard',         color: '#2e63a6' },
  { value: 'MEETS_STANDARD',  label: 'Meets Standard',         color: '#5c5690' },
  { value: 'ALMOST_STANDARD', label: 'Almost Up to Standard',  color: '#d17306' },
  { value: 'BELOW_STANDARD',  label: 'Below Standard',         color: '#e52321' },
]

const LOCKED_STATUSES = new Set(['REVIEWED', 'CLOSED'])
const CLOSED_STATUSES = new Set(['SUBMITTED', 'REVIEWED', 'CLOSED', 'PENDING_REVIEW'])

function bandFor(score: number) {
  return BANDS.find(b => score >= b.min && score < b.max) ?? BANDS[BANDS.length - 1]
}

function displayName(ev: Evaluation) {
  return ev.evaluateeName?.trim() || ev.evaluatee?.name || 'Employee'
}

function departmentOf(ev: Evaluation) {
  return ev.evaluatee?.department || 'Unassigned'
}

function gradeColor(grade: PerformanceGrade | null | undefined) {
  return GRADE_OPTIONS.find(g => g.value === grade)?.color ?? 'var(--kbt-text-3)'
}

function gradeLabel(grade: PerformanceGrade | null | undefined) {
  return GRADE_OPTIONS.find(g => g.value === grade)?.label ?? '—'
}

export default function CalibrationPage() {
  const { statusLabel } = useLabels()
  const t = useT()
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [bandFilter, setBandFilter] = useState<'ALL' | BandKey>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')

  const { data: evaluations = [], isLoading, isError } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', 'calibration'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const scored = useMemo(
    () => evaluations.filter(ev => ev.totalScore != null) as Array<Evaluation & { totalScore: number }>,
    [evaluations],
  )

  const gradeMutation = useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: PerformanceGrade }) =>
      api.patch(`/evaluations/${id}/summary`, { performanceGrade: grade }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', 'calibration'] }),
  })

  const lockMutation = useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: PerformanceGrade }) =>
      api.patch(`/evaluations/${id}/summary`, { performanceGrade: grade })
        .then(() => api.patch(`/evaluations/${id}/review`))
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', 'calibration'] }),
  })

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scored
      .filter(ev => {
        if (bandFilter !== 'ALL' && bandFor(ev.totalScore).key !== bandFilter) return false
        if (statusFilter === 'OPEN' && CLOSED_STATUSES.has(ev.status)) return false
        if (statusFilter === 'CLOSED' && !CLOSED_STATUSES.has(ev.status)) return false
        if (!q) return true
        return `${displayName(ev)} ${departmentOf(ev)} ${ev.evaluatee?.position ?? ''} ${ev.evaluatorName ?? ev.evaluator?.name ?? ''}`.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const aBand = bandFor(a.totalScore).key
        const bBand = bandFor(b.totalScore).key
        const priority: Record<BandKey, number> = { top: 0, risk: 1, watch: 2, strong: 3, solid: 4 }
        return priority[aBand] - priority[bBand] || b.totalScore - a.totalScore
      })
  }, [scored, query, bandFilter, statusFilter])

  const gradeSet = scored.filter(ev => ev.performanceGrade != null).length
  const locked = scored.filter(ev => LOCKED_STATUSES.has(ev.status)).length
  const pending = scored.filter(ev => !LOCKED_STATUSES.has(ev.status)).length

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('cal.eyebrow')}</span>
          <h1>{t('cal.title')}</h1>
          <p>{t('cal.desc')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="amw-loading-panel"><Spinner size={18} /> {t('cal.loading')}</div>
      ) : isError ? (
        <div className="kbt-card">
          <EmptyState
            icon={Gauge}
            title={t('cal.loadFailed')}
            description={t('cal.loadFailedDesc')}
          />
        </div>
      ) : scored.length === 0 ? (
        <div className="kbt-card">
          <EmptyState
            icon={Gauge}
            title={t('cal.noScored')}
            description={t('cal.noScoredDesc')}
            action={{ label: t('cal.goToEval'), to: '/evaluations' }}
          />
        </div>
      ) : (
        <div className="amw-stack">
          <section className="kbt-card" style={{ padding: 18 }}>
            <div className="kbt-metric-grid kbt-metric-grid-4">
              {[
                { label: t('cal.metricScored'),    value: scored.length,                icon: <Gauge size={14} color="var(--sap-blue)" /> },
                { label: t('cal.metricGradeSet'),  value: `${gradeSet}/${scored.length}`, icon: <ListChecks size={14} color="var(--m-blue)" /> },
                { label: t('cal.metricLocked'),    value: locked,                       icon: <Lock size={14} color="var(--m-light-blue)" /> },
                { label: t('cal.metricPending'),   value: pending,                      icon: <ClipboardCheck size={14} color="var(--amw-red)" /> },
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

          <section className="kbt-card">
            <div style={{ padding: 14, borderBottom: '1px solid var(--kbt-border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)' }} />
                <input
                  className="kbt-input"
                  style={{ paddingLeft: 34 }}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('cal.searchPlaceholder')}
                />
              </div>
              <select className="kbt-input" style={{ maxWidth: 180 }} value={bandFilter} onChange={e => setBandFilter(e.target.value as 'ALL' | BandKey)}>
                <option value="ALL">{t('cal.allBands')}</option>
                {BANDS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
              <select className="kbt-input" style={{ maxWidth: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'CLOSED')}>
                <option value="ALL">{t('cal.allStatuses')}</option>
                <option value="OPEN">{t('cal.openOnly')}</option>
                <option value="CLOSED">{t('cal.submittedClosed')}</option>
              </select>
              <span style={{ marginLeft: 'auto', color: 'var(--kbt-text-3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {candidates.length} / {scored.length}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="kbt-table">
                <thead>
                  <tr>
                    <th>{t('table.employee')}</th>
                    <th>{t('table.department')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.score')}</th>
                    <th>{t('cal.band')}</th>
                    <th>{t('cal.finalGrade')}</th>
                    <th>{t('table.status')}</th>
                    <th style={{ textAlign: 'right' }}>{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(ev => {
                    const band = bandFor(ev.totalScore)
                    const isLocked = LOCKED_STATUSES.has(ev.status)
                    const currentGrade = ev.performanceGrade ?? band.autoGrade

                    return (
                      <tr key={ev.id}>
                        <td>
                          <strong>{displayName(ev)}</strong>
                          <p style={{ marginTop: 2, color: 'var(--kbt-text-3)', fontSize: '0.7rem' }}>
                            {ev.evaluatorName || ev.evaluator?.name || t('cal.noEvaluator')}
                          </p>
                        </td>
                        <td>{departmentOf(ev)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="kbt-score-value">{ev.totalScore.toFixed(2)}</span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '2px 10px', borderRadius: 999,
                            background: `${band.color}22`, border: `1px solid ${band.color}66`,
                            color: band.color, fontWeight: 800, fontSize: '0.7rem',
                          }}>
                            <CheckCircle2 size={11} /> {band.label}
                          </span>
                        </td>
                        <td>
                          {isLocked ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '2px 10px', borderRadius: 999,
                              background: `${gradeColor(ev.performanceGrade)}22`,
                              border: `1px solid ${gradeColor(ev.performanceGrade)}55`,
                              color: gradeColor(ev.performanceGrade),
                              fontWeight: 800, fontSize: '0.7rem',
                            }}>
                              <ShieldCheck size={11} /> {gradeLabel(ev.performanceGrade)}
                            </span>
                          ) : (
                            <select
                              className="kbt-input"
                              style={{ height: 30, padding: '0 8px', fontSize: '0.78rem', maxWidth: 200 }}
                              value={currentGrade}
                              disabled={gradeMutation.isPending}
                              onChange={e => gradeMutation.mutate({
                                id: ev.id,
                                grade: e.target.value as PerformanceGrade,
                              })}
                            >
                              {GRADE_OPTIONS.map(g => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <span className={{
                            DRAFT: 'kbt-badge-neutral',
                            IN_PROGRESS: 'kbt-badge-warning',
                            SUBMITTED: 'kbt-badge-info',
                            PENDING_REVIEW: 'kbt-badge-orange',
                            REVIEWED: 'kbt-badge-success',
                            CLOSED: 'kbt-badge-neutral',
                          }[ev.status] ?? 'kbt-badge-neutral'}>{statusLabel(ev.status)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                            {!isLocked && (
                              <button
                                className="kbt-btn-ghost"
                                style={{ height: 30, padding: '0 10px', gap: 5 }}
                                disabled={lockMutation.isPending}
                                onClick={() => lockMutation.mutate({ id: ev.id, grade: currentGrade })}
                              >
                                <Lock size={11} /> {t('cal.lock')}
                              </button>
                            )}
                            <Link
                              className="kbt-btn-ghost"
                              style={{ height: 30, padding: '0 10px' }}
                              to={`/evaluations/${ev.id}`}
                            >
                              {t('common.open')}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
