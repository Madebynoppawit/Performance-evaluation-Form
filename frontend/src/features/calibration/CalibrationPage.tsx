import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, LockKeyhole, Search, SlidersHorizontal, Star, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Evaluation } from '@/types'
import EmptyState from '@/components/EmptyState'
import { SkeletonMetricCard, SkeletonTableRows } from '@/components/Skeleton'
import { toGpa } from '@/lib/score'
import { formatDate } from '@/lib/utils'
import { useT } from '@/i18n/languageContext'

type Band = 'top' | 'strong' | 'solid' | 'watch' | 'risk'
type StatusFilter = 'ALL' | 'OPEN' | 'CLOSED'

const BAND_OPTIONS: Array<{ value: 'ALL' | Band; label: string }> = [
  { value: 'ALL', label: 'All bands' },
  { value: 'top', label: 'Exceptional' },
  { value: 'strong', label: 'Strong' },
  { value: 'solid', label: 'Solid' },
  { value: 'watch', label: 'Watch' },
  { value: 'risk', label: 'Risk' },
]

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
]

const GRADE_LABELS: Record<NonNullable<Evaluation['performanceGrade']>, string> = {
  EXCELLENT: 'Excellent',
  ABOVE_STANDARD: 'Above Standard',
  MEETS_STANDARD: 'Meets Standard',
  ALMOST_STANDARD: 'Almost Standard',
  BELOW_STANDARD: 'Below Standard',
}

function scoreBand(score: number): Band {
  if (score >= 3.7) return 'top'
  if (score >= 3.2) return 'strong'
  if (score >= 2.6) return 'solid'
  if (score >= 2.0) return 'watch'
  return 'risk'
}

function bandLabel(band: Band) {
  return BAND_OPTIONS.find((option) => option.value === band)?.label ?? band
}

function defaultGrade(score: number): NonNullable<Evaluation['performanceGrade']> {
  if (score >= 3.7) return 'EXCELLENT'
  if (score >= 3.2) return 'ABOVE_STANDARD'
  if (score >= 2.6) return 'MEETS_STANDARD'
  if (score >= 2.0) return 'ALMOST_STANDARD'
  return 'BELOW_STANDARD'
}

export default function CalibrationPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [band, setBand] = useState<'ALL' | Band>('ALL')
  const [status, setStatus] = useState<StatusFilter>('ALL')

  const { data = [], isLoading, isError, refetch } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
  })

  const scored = useMemo(
    () => data
      .filter((evaluation) => evaluation.totalScore != null)
      .map((evaluation) => {
        const gpa = toGpa(evaluation.totalScore ?? 0)
        return {
          ...evaluation,
          gpa,
          band: scoreBand(gpa),
          grade: evaluation.performanceGrade ?? defaultGrade(gpa),
        }
      }),
    [data],
  )

  const filtered = scored.filter((evaluation) => {
    const q = search.trim().toLowerCase()
    const searchable = [
      evaluation.evaluatee?.name,
      evaluation.evaluatee?.department,
      evaluation.evaluator?.name,
      evaluation.evaluatorName,
      evaluation.cycle?.name,
    ].filter(Boolean).join(' ').toLowerCase()
    const matchesSearch = !q || searchable.includes(q)
    const matchesBand = band === 'ALL' || evaluation.band === band
    const isClosed = ['SUBMITTED', 'REVIEWED', 'CLOSED'].includes(evaluation.status)
    const matchesStatus = status === 'ALL' || (status === 'CLOSED' ? isClosed : !isClosed)
    return matchesSearch && matchesBand && matchesStatus
  })

  const graded = scored.filter((evaluation) => evaluation.performanceGrade).length
  const locked = scored.filter((evaluation) => ['REVIEWED', 'CLOSED'].includes(evaluation.status)).length

  if (isError) {
    return (
      <div className="kbt-page">
        <EmptyState
          icon={SlidersHorizontal}
          title={t('cal.loadFailed')}
          description={t('cal.loadFailedDesc')}
          action={{ label: t('common.refresh'), onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('cal.eyebrow')}</span>
          <h1>{t('cal.title')}</h1>
          <p>{t('cal.desc')}</p>
        </div>
      </div>

      <div className="kbt-metric-grid kbt-metric-grid-4">
        {isLoading ? [0, 1, 2, 3].map((item) => <SkeletonMetricCard key={item} />) : (
          <>
            <div className="kbt-metric">
              <div className="kbt-metric-head"><span>{t('cal.metricScored')}</span><div className="kbt-metric-icon"><TrendingUp size={15} /></div></div>
              <strong>{scored.length}/{data.length}</strong>
            </div>
            <div className="kbt-metric">
              <div className="kbt-metric-head"><span>{t('cal.metricGradeSet')}</span><div className="kbt-metric-icon"><Star size={15} /></div></div>
              <strong>{graded}/{scored.length}</strong>
            </div>
            <div className="kbt-metric">
              <div className="kbt-metric-head"><span>{t('cal.metricLocked')}</span><div className="kbt-metric-icon"><LockKeyhole size={15} /></div></div>
              <strong>{locked}/{scored.length}</strong>
            </div>
            <div className="kbt-metric">
              <div className="kbt-metric-head"><span>{t('cal.metricPending')}</span><div className="kbt-metric-icon"><Award size={15} /></div></div>
              <strong>{Math.max(0, scored.length - locked)}/{scored.length}</strong>
            </div>
          </>
        )}
      </div>

      <section className="kbt-card">
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">{t('cal.title')}</span>
          <div className="kbt-spacer" />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
            <input
              className="kbt-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('cal.searchPlaceholder')}
              style={{ paddingLeft: 32, width: 260, height: 32, fontSize: '0.8125rem' }}
            />
          </div>
          <select className="kbt-input" value={band} onChange={(event) => setBand(event.target.value as 'ALL' | Band)} style={{ width: 150, height: 32 }}>
            {BAND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="kbt-input" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} style={{ width: 150, height: 32 }}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {isLoading ? (
          <table className="kbt-table"><tbody><SkeletonTableRows rows={6} cols={7} /></tbody></table>
        ) : scored.length === 0 ? (
          <EmptyState
            icon={Award}
            title={t('cal.noScored')}
            description={t('cal.noScoredDesc')}
            action={{ label: t('cal.goToEval'), to: '/evaluations' }}
          />
        ) : (
          <table className="kbt-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Score</th>
                <th>Band</th>
                <th>Final Grade</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((evaluation) => (
                <tr key={evaluation.id}>
                  <td>
                    <strong>{evaluation.evaluatee?.name ?? evaluation.evaluateeName ?? evaluation.evaluateeId}</strong>
                    <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem', marginTop: 2 }}>{evaluation.cycle?.name ?? formatDate(evaluation.updatedAt)}</p>
                  </td>
                  <td>{evaluation.evaluatee?.department ?? '-'}</td>
                  <td><span className="kbt-score-value">{evaluation.gpa.toFixed(2)}</span></td>
                  <td><span className="kbt-badge-info">{bandLabel(evaluation.band)}</span></td>
                  <td>
                    <select className="kbt-input" value={evaluation.grade} aria-label={`Final grade for ${evaluation.evaluatee?.name ?? evaluation.id}`} style={{ minWidth: 150, height: 30 }}>
                      {Object.entries(GRADE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={['REVIEWED', 'CLOSED'].includes(evaluation.status) ? 'kbt-badge-success' : 'kbt-badge-warning'}>
                      {['REVIEWED', 'CLOSED'].includes(evaluation.status) ? 'Locked' : 'Open'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/evaluations/${evaluation.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={CheckCircle2} title="No matching calibration rows" description="Adjust search, band, or status filters." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
