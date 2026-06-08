import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckSquare, ChevronRight, FileCheck2, Loader2, Save, Scale, ScrollText, Send, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import type { AttendanceScore, CompetencyScore, Evaluation, EvaluationComment, GoalEntry, SalarySummary } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
import type { TranslationKey } from '@/i18n/translations'
import { getCompetenciesForPosition, POSITION_LABELS, RATING_SCALE } from './constants/competency'
import GoalSettingSection from './components/GoalSettingSection'
import CompetencySection from './components/CompetencySection'
import AttendanceSection from './components/AttendanceSection'
import CommentSection from './components/CommentSection'
import SalarySummarySection from './components/SalarySummarySection'
import AcknowledgementSection from './components/AcknowledgementSection'
import EvaluationExportMenu from './components/EvaluationExportMenu'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED: { cls: 'kbt-badge-info', label: 'Submitted' },
  REVIEWED: { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED: { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const SECTIONS: { id: string; num: string; key: TranslationKey }[] = [
  { id: 'info', num: '01', key: 'ef.sec.info' },
  { id: 'rating', num: '02', key: 'ef.sec.rating' },
  { id: 'instruction', num: '03', key: 'ef.sec.instruction' },
  { id: 'goals', num: '04', key: 'ef.sec.goals' },
  { id: 'competency', num: '05', key: 'ef.sec.competency' },
  { id: 'attendance', num: '06', key: 'ef.sec.attendance' },
  { id: 'comment', num: '07', key: 'ef.sec.comment' },
  { id: 'summary', num: '08', key: 'ef.sec.summary' },
  { id: 'salary', num: '09', key: 'ef.sec.salary' },
  { id: 'acknowledge', num: '10', key: 'ef.sec.acknowledge' },
]

const dash = (value?: string | number | null) => value ?? '-'

export default function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isAdmin, isManager } = useAuth()
  const t = useT()
  const { statusLabel, typeLabel } = useLabels()

  const { data: ev, isLoading } = useQuery<Evaluation>({
    queryKey: ['evaluations', id],
    queryFn: () => api.get(`/evaluations/${id}`).then(r => r.data),
  })

  const [goals, setGoals] = useState<GoalEntry[]>([])
  const [compScores, setCompScores] = useState<CompetencyScore[]>([])
  const [attendance, setAttendance] = useState<AttendanceScore>({ disciplinaryLevel: 'NONE' })
  const [comment, setComment] = useState<EvaluationComment>({})
  const [salary, setSalary] = useState<SalarySummary>({})
  const [section, setSection] = useState('info')
  const [saved, setSaved] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<string[]>([])

  useEffect(() => {
    if (!ev) return
    setGoals(ev.goalEntries ?? [])
    setCompScores(ev.competencyScores ?? [])
    setAttendance(ev.attendanceRecord ?? { disciplinaryLevel: 'NONE' })
    setComment(ev.comment ?? {})
    setSalary(ev.salarySummary ?? {})
  }, [ev])

  const isReadOnly = ['SUBMITTED', 'REVIEWED', 'CLOSED'].includes(ev?.status ?? '') && !isAdmin

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.patch(`/evaluations/${id}/goals`, { goals }),
        api.patch(`/evaluations/${id}/competency`, { scores: compScores }),
        api.patch(`/evaluations/${id}/attendance`, attendance),
        api.patch(`/evaluations/${id}/comment`, comment),
        ...(isAdmin || isManager ? [api.patch(`/evaluations/${id}/salary`, salary)] : []),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      setSubmitErrors([])
      await saveMutation.mutateAsync()
      await api.patch(`/evaluations/${id}/submit`, {})
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      navigate('/evaluations')
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { details?: { missing?: string[] } } } }).response?.data
      setSubmitErrors(data?.details?.missing ?? ['Submit failed. Please review the annual form requirements.'])
    },
  })

  const ackMutation = useMutation({
    mutationFn: (signerType: 'employee' | 'evaluator' | 'director') => api.post(`/evaluations/${id}/acknowledge`, { signerType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', id] }),
  })

  const pos = ev?.evaluatee?.position
  const readinessMissing = useMemo(() => {
    const missing: string[] = []
    if (goals.length === 0) missing.push('Goal Setting requires at least 1 SMART goal.')
    if (goals.length > 5) missing.push('Goal Setting allows no more than 5 goals.')
    const totalWeight = goals.reduce((sum, goal) => sum + (Number(goal.weight) || 0), 0)
    if (goals.length > 0 && Math.abs(totalWeight - 100) > 0.001) missing.push('Goal Setting total weight must equal 100%.')
    goals.forEach((goal, index) => {
      const label = `Goal ${index + 1}`
      if (!goal.goal.trim()) missing.push(`${label}: Goal is required.`)
      if ((Number(goal.weight) || 0) <= 0) missing.push(`${label}: Weight must be greater than 0.`)
      if (goal.evaluationScore == null) missing.push(`${label}: Evaluation Score is required.`)
      const targets = [goal.targetRating5, goal.targetRating4, goal.targetRating3, goal.targetRating2, goal.targetRating1]
      if (targets.some(target => !target || !/^\d+(\.\d+)?$/.test(target.trim()))) {
        missing.push(`${label}: Target per rating must be numeric for ratings 5-1.`)
      }
    })

    if (!pos) {
      missing.push('Employee position is required for position-based competency.')
    } else {
      const expected = getCompetenciesForPosition(pos).map(c => c.id)
      const scored = new Set(compScores.filter(score => score.score != null).map(score => score.competencyId))
      const missingCompetencies = expected.filter(competencyId => !scored.has(competencyId))
      if (missingCompetencies.length) missing.push(`Competency requires ratings for: ${missingCompetencies.join(', ')}.`)
    }

    if (attendance.leaveActualDays == null) missing.push('Attendance requires leave actual days.')
    if (attendance.lateActualTimes == null) missing.push('Attendance requires late actual times.')
    if (!attendance.disciplinaryLevel) missing.push('Attendance requires disciplinary level.')
    if (!comment.strengths?.trim()) missing.push('Comment requires strengths.')
    if (!comment.improvements?.trim()) missing.push('Comment requires areas for improvement.')
    if (!comment.requiredSkills?.trim()) missing.push('Comment requires required skills.')
    return missing
  }, [attendance, comment, compScores, goals, pos])
  const isRequirementReady = readinessMissing.length === 0

  if (isLoading) {
    return (
      <div className="amw-loading-panel">
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        {t('ef.loading')}
      </div>
    )
  }

  if (!ev) return <div className="kbt-msg-error">{t('ef.notFound')}</div>

  const factItems = [
    [t('eval.evaluator'), ev.evaluator?.name],
    [t('table.department'), ev.evaluatee?.department],
    [t('ef.fld.periodEnd'), ev.cycle?.endDate ? formatDate(ev.cycle.endDate) : '-'],
    [t('ef.fld.goal'), ev.goalScore != null ? ev.goalScore.toFixed(2) : '-'],
    [t('ef.sec.competency'), ev.competencyScore != null ? ev.competencyScore.toFixed(2) : '-'],
    [t('ef.sec.attendance'), ev.attendanceScore != null ? ev.attendanceScore.toFixed(2) : '-'],
  ]

  return (
    <div className="kbt-page">
      <nav className="amw-breadcrumb">
        <Link to="/evaluations">{t('nav.evaluations')}</Link>
        <ChevronRight size={12} />
        <span>{ev.cycle?.name}</span>
      </nav>

      <section className="amw-studio-hero" style={{ minHeight: 188 }}>
        <div className="amw-hero-copy">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="amw-eyebrow">{t('ef.reviewRecord')}</span>
            <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{statusLabel(ev.status)}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.3vw, 3.5rem)' }}>{ev.evaluatee?.name}</h1>
          <p>
            {ev.cycle?.name} · {typeLabel(ev.type)}
            {pos ? ` · ${POSITION_LABELS[pos]}` : ''}
          </p>
          <div className="amw-hero-badges">
            {factItems.slice(0, 3).map(([label, value]) => <span key={label}>{label}: {dash(value)}</span>)}
            <span>{t('ef.amwStandard')}</span>
          </div>
        </div>
        <div className="amw-hero-actions amw-corporate-stack">
          <div className="amw-corporate-seal amw-corporate-seal--compact">
            <Scale size={22} />
            <span>{t('ef.legalFile')}</span>
            <strong>{statusLabel(ev.status)}</strong>
          </div>
          {ev.totalScore != null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--kbt-text-3)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('ef.totalScore')}</span>
              <div className="kbt-score-value" style={{ fontSize: '3rem', lineHeight: 1 }}>{ev.totalScore.toFixed(2)}</div>
            </div>
          )}
        </div>
      </section>

      <div className="kbt-card" style={{ padding: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <EvaluationExportMenu evaluationId={ev.id} employeeName={ev.evaluatee?.name} />
        {!isReadOnly && (
          <>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="kbt-btn-outline">
            {saveMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saveMutation.isPending ? t('ef.saving') : saved ? t('common.saved') : t('ef.saveDraft')}
          </button>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !isRequirementReady}
            className="kbt-btn-primary"
            title={isRequirementReady ? t('ef.submitReady') : t('ef.submitBlocked')}
          >
            {submitMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
            {submitMutation.isPending ? t('ef.submitting') : t('ef.submit')}
          </button>
          </>
        )}
      </div>

      <div className="amw-corporate-strip">
        <div>
          <ShieldCheck size={15} />
          <span>{t('ef.accessRole')}</span>
        </div>
        <div>
          <ScrollText size={15} />
          <span>{t('ef.commentsRetained')}</span>
        </div>
        <div>
          <FileCheck2 size={15} />
          <span>{t('ef.submitConfirms')}</span>
        </div>
      </div>

      {!isReadOnly && (
        <div className={`kbt-card ${isRequirementReady ? 'amw-requirement-ready' : 'amw-requirement-missing'}`} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: isRequirementReady ? 'rgba(22,88,142,0.14)' : 'rgba(237,28,36,0.1)',
              color: isRequirementReady ? 'var(--m-light-blue)' : 'var(--amw-red)',
            }}>
              <FileCheck2 size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ color: 'var(--kbt-text)', fontSize: '0.92rem' }}>
                {t('ef.readinessTitle')}
              </strong>
              <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.78rem', marginTop: 3 }}>
                {isRequirementReady
                  ? t('ef.readinessReady')
                  : `${readinessMissing.length} requirement item${readinessMissing.length > 1 ? 's' : ''} must be completed before submission.`}
              </p>
              {!isRequirementReady && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--kbt-text-2)', fontSize: '0.78rem', lineHeight: 1.55 }}>
                  {readinessMissing.slice(0, 6).map(item => <li key={item}>{item}</li>)}
                  {readinessMissing.length > 6 && <li>{readinessMissing.length - 6} more item(s).</li>}
                </ul>
              )}
              {submitErrors.length > 0 && (
                <div className="kbt-msg-error" style={{ marginTop: 12, fontSize: '0.78rem' }}>
                  {submitErrors.slice(0, 4).map(item => <p key={item}>{item}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <nav style={{ width: 190, flexShrink: 0 }}>
          <div className="kbt-card" style={{ position: 'sticky', top: 16, padding: 6 }}>
            {SECTIONS.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={`kbt-section-tab${section === item.id ? ' active' : ''}`}>
                <span>{item.num}</span>{t(item.key)}
              </button>
            ))}
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'info' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">01 · {t('ef.title.info')}</span></div>
              <div className="kbt-card-body">
                <div className="amw-grid-2" style={{ gap: '16px 32px' }}>
                  {[
                    [t('ef.fld.employee'), ev.evaluatee?.name],
                    [t('eval.evaluator'), ev.evaluator?.name],
                    [t('table.department'), ev.evaluatee?.department],
                    [t('acc.position'), pos ? POSITION_LABELS[pos] : '-'],
                    [t('eval.evaluationType'), typeLabel(ev.type)],
                    [t('table.cycle'), ev.cycle?.name],
                    [t('table.startDate'), ev.cycle?.startDate ? formatDate(ev.cycle.startDate) : '-'],
                    [t('table.endDate'), ev.cycle?.endDate ? formatDate(ev.cycle.endDate) : '-'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="kbt-fact-label">{label}</p>
                      <p className="kbt-fact-value">{dash(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'rating' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">02 · {t('ef.title.rating')}</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="kbt-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Score</th>
                      <th>Definition (EN)</th>
                      <th>คำอธิบาย (TH)</th>
                      <th>Behavior Indicator (EN)</th>
                      <th>Behavior Indicator (TH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RATING_SCALE.map((rating) => (
                      <tr key={rating.score}>
                        <td style={{ textAlign: 'center' }}>
                          <span className="kbt-rating-chip">{rating.score}</span>
                          <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.68rem', marginTop: 6 }}>{rating.labelEn}</p>
                        </td>
                        <td>
                          <strong>{rating.labelEn}</strong>
                          <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.75rem', marginTop: 4 }}>{rating.definitionEn}</p>
                        </td>
                        <td>
                          <strong>{rating.labelTh}</strong>
                          <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.75rem', marginTop: 4 }}>{rating.definitionTh}</p>
                        </td>
                        <td style={{ color: 'var(--kbt-text-2)', fontSize: '0.8rem' }}>{rating.indicatorEn}</td>
                        <td style={{ color: 'var(--kbt-text-2)', fontSize: '0.8rem' }}>{rating.indicatorTh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'instruction' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">03 · {t('ef.sec.instruction')}</span></div>
              <div className="kbt-card-body">
                {[
                  t('ef.ins1'),
                  t('ef.ins2'),
                  t('ef.ins3'),
                  t('ef.ins4'),
                  `${t('ef.fld.goal')} (${ev.goalWeight}%) · ${t('ef.sec.competency')} (${ev.competencyWeight}%) · ${t('ef.sec.attendance')} (${ev.attendanceWeight}%)`,
                  t('ef.ins6'),
                ].map((text, index) => (
                  <div key={text} className="kbt-instruction-row">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'goals' && <SectionCard title={`04 · ${t('ef.sec.goals')}`}><GoalSettingSection goals={goals} readOnly={isReadOnly} onChange={setGoals} /></SectionCard>}
          {section === 'competency' && <SectionCard title={`05 · ${t('ef.title.competency')} (${ev.competencyWeight}%)`}><CompetencySection position={pos} scores={compScores} readOnly={isReadOnly} onChange={setCompScores} /></SectionCard>}
          {section === 'attendance' && <SectionCard title={`06 · ${t('ef.sec.attendance')}`}><AttendanceSection data={attendance} readOnly={isReadOnly} onChange={setAttendance} /></SectionCard>}
          {section === 'comment' && <SectionCard title={`07 · ${t('ef.sec.comment')}`}><CommentSection data={comment} readOnly={isReadOnly} onChange={setComment} /></SectionCard>}

          {section === 'summary' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">08 · {t('ef.title.summary')}</span></div>
              <div className="kbt-card-body">
                {[
                  { label: t('ef.sec.goals'), weight: ev.goalWeight, score: ev.goalScore },
                  { label: t('ef.sec.competency'), weight: ev.competencyWeight, score: ev.competencyScore },
                  { label: t('ef.sec.attendance'), weight: ev.attendanceWeight, score: ev.attendanceScore },
                ].map(({ label, weight, score }) => (
                  <div key={label} className="kbt-summary-row">
                    <div>
                      <strong>{label}</strong>
                      <span>{t('ef.weight')}: {weight}%</span>
                    </div>
                    <span className="kbt-score-value">{score != null ? score.toFixed(2) : '-'}</span>
                  </div>
                ))}
                <div className="kbt-summary-total">
                  <div>
                    <strong>{t('ef.totalScore')}</strong>
                    <span>{ev.totalScore != null ? scoreBand(ev.totalScore) : t('ef.pendingCalc')}</span>
                  </div>
                  <span className="kbt-score-value" style={{ fontSize: '2.5rem' }}>{ev.totalScore != null ? ev.totalScore.toFixed(2) : '-'}</span>
                </div>
              </div>
            </div>
          )}

          {section === 'salary' && (
            <SectionCard title={`09 · ${t('ef.sec.salary')}`}>
              {isAdmin || isManager
                ? <SalarySummarySection data={salary} readOnly={isReadOnly && !isAdmin} onChange={setSalary} />
                : <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>{t('ef.salaryRestricted')}</div>}
            </SectionCard>
          )}

          {section === 'acknowledge' && (
            <div className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title">10 · {t('ef.sec.acknowledge')}</span>
                <CheckSquare size={16} color="var(--kbt-text-3)" />
              </div>
              <div className="kbt-card-body">
                <AcknowledgementSection
                  data={ev.acknowledgement}
                  currentUserId={user?.id ?? ''}
                  evaluateeId={ev.evaluateeId}
                  evaluatorId={ev.evaluatorId}
                  isAdmin={isAdmin}
                  onSign={(type) => ackMutation.mutate(type)}
                  isSigning={ackMutation.isPending}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="kbt-card">
      <div className="kbt-card-header"><span className="kbt-card-title">{title}</span></div>
      <div className="kbt-card-body">{children}</div>
    </div>
  )
}

function scoreBand(score: number) {
  if (score >= 4.5) return '5 - Role Model'
  if (score >= 3.5) return '4 - Exceeds Expectation'
  if (score >= 2.5) return '3 - Meets Expectation'
  if (score >= 1.5) return '2 - Needs Improvement'
  return '1 - Unsatisfactory'
}
