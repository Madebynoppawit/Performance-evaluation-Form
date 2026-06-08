import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckSquare, ChevronRight, FileCheck2, Loader2, Save, Scale, ScrollText, Send, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import type { AttendanceScore, CompetencyScore, Evaluation, EvaluationComment, GoalEntry, SalarySummary, TrainingScore } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useT, useLanguage } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
import type { TranslationKey } from '@/i18n/translations'
import { getCompetenciesForPosition, POSITION_LABELS, RATING_SCALE } from './constants/competency'
import { getFormDefinition, EVALUATION_REASONS } from './constants/formDefinitions'
import OseEvaluationSection from './components/OseEvaluationSection'
import GoalSettingSection from './components/GoalSettingSection'
import CompetencySection from './components/CompetencySection'
import AttendanceSection from './components/AttendanceSection'
import TrainingSection from './components/TrainingSection'
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

const SEC_KEY: Record<string, TranslationKey> = {
  info: 'ef.sec.info',
  rating: 'ef.sec.rating',
  instruction: 'ef.sec.instruction',
  goals: 'ef.sec.goals',
  evaluation: 'ef.sec.evaluation',
  competency: 'ef.sec.competency',
  attendance: 'ef.sec.attendance',
  training: 'ef.sec.training',
  comment: 'ef.sec.comment',
  summary: 'ef.sec.summary',
  salary: 'ef.sec.salary',
  acknowledge: 'ef.sec.acknowledge',
}

const OSE_SECTIONS = ['info', 'rating', 'instruction', 'goals', 'evaluation', 'competency', 'attendance', 'training', 'comment', 'summary', 'acknowledge']
const LEGACY_SECTIONS = ['info', 'rating', 'instruction', 'goals', 'competency', 'attendance', 'training', 'comment', 'summary', 'salary', 'acknowledge']

const dash = (value?: string | number | null) => value ?? '-'

export default function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isAdmin, isManager } = useAuth()
  const t = useT()
  const { locale } = useLanguage()
  const { statusLabel, typeLabel } = useLabels()

  const { data: ev, isLoading } = useQuery<Evaluation>({
    queryKey: ['evaluations', id],
    queryFn: () => api.get(`/evaluations/${id}`).then(r => r.data),
  })

  const [goals, setGoals] = useState<GoalEntry[]>([])
  const [compScores, setCompScores] = useState<CompetencyScore[]>([])
  const [attendance, setAttendance] = useState<AttendanceScore>({ disciplinaryLevel: 'NONE' })
  const [training, setTraining] = useState<TrainingScore>({})
  const [comment, setComment] = useState<EvaluationComment>({})
  const [salary, setSalary] = useState<SalarySummary>({})
  const [summary, setSummary] = useState<{
    evaluateeName: string | null
    evaluationReason: string | null
    evaluationReasonOther: string | null
    evaluatorTitle: string | null
    performanceGrade: string | null
    effectiveDate: string | null
  }>({ evaluateeName: null, evaluationReason: null, evaluationReasonOther: null, evaluatorTitle: null, performanceGrade: null, effectiveDate: null })
  const [section, setSection] = useState('info')
  const [saved, setSaved] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<string[]>([])

  useEffect(() => {
    if (!ev) return
    const e = ev as typeof ev & {
      evaluateeName?: string | null
      evaluationReason?: string | null
      evaluationReasonOther?: string | null
      evaluatorTitle?: string | null
      performanceGrade?: string | null
      effectiveDate?: string | null
    }
    setGoals(ev.goalEntries ?? [])
    setCompScores(ev.competencyScores ?? [])
    setAttendance(ev.attendanceRecord ?? { disciplinaryLevel: 'NONE' })
    setTraining(ev.trainingRecord ?? {})
    setComment(ev.comment ?? {})
    setSalary(ev.salarySummary ?? {})
    setSummary({
      evaluateeName: e.evaluateeName ?? null,
      evaluationReason: e.evaluationReason ?? null,
      evaluationReasonOther: e.evaluationReasonOther ?? null,
      evaluatorTitle: e.evaluatorTitle ?? null,
      performanceGrade: e.performanceGrade ?? null,
      effectiveDate: e.effectiveDate ? e.effectiveDate.substring(0, 10) : null,
    })
  }, [ev])

  const formDef = getFormDefinition((ev as { formType?: string } | undefined)?.formType)
  // Every position-level appraisal form shares the OSE skeleton (flat rating,
  // no goal setting); the legacy weighted form is the only non-appraisal one.
  const isOse = !formDef.sections.goalSetting
  const sectionIds = isOse ? OSE_SECTIONS : LEGACY_SECTIONS
  const sections = sectionIds.map((id, i) => ({ id, num: String(i + 1).padStart(2, '0'), key: SEC_KEY[id] }))
  const numOf = (id: string) => sections.find(s => s.id === id)?.num ?? ''

  const isReadOnly = ['SUBMITTED', 'REVIEWED', 'CLOSED'].includes(ev?.status ?? '') && !isAdmin

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isOse) {
        await Promise.all([
          api.patch(`/evaluations/${id}/goals`, { goals }),
          api.patch(`/evaluations/${id}/competency`, { scores: compScores }),
          api.patch(`/evaluations/${id}/attendance`, attendance),
          api.patch(`/evaluations/${id}/training`, training),
          api.patch(`/evaluations/${id}/comment`, comment),
          api.patch(`/evaluations/${id}/summary`, summary),
        ])
        return
      }
      await Promise.all([
        api.patch(`/evaluations/${id}/goals`, { goals }),
        api.patch(`/evaluations/${id}/competency`, { scores: compScores }),
        api.patch(`/evaluations/${id}/attendance`, attendance),
        api.patch(`/evaluations/${id}/training`, training),
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
      setSubmitErrors(data?.details?.missing ?? [t('rd.submitFailed')])
    },
  })

  const ackMutation = useMutation({
    mutationFn: (signerType: 'employee' | 'evaluator' | 'director') => api.post(`/evaluations/${id}/acknowledge`, { signerType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', id] }),
  })

  const pos = ev?.evaluatee?.position
  const evHireDate = (ev?.evaluatee as { hireDate?: string | null } | undefined)?.hireDate ?? null
  const displayName = (isOse && summary.evaluateeName?.trim()) ? summary.evaluateeName.trim() : (ev?.evaluatee?.name ?? '')
  const readinessMissing = useMemo(() => {
    if (isOse) {
      const missing: string[] = []
      const scored = new Set(compScores.filter(s => s.score != null).map(s => s.competencyId))
      const allRated = formDef.categories.flatMap(c => c.criteria).every(c => scored.has(c.id))
      if (!allRated) missing.push(t('rd.oseAllCriteria'))
      if (!comment.strengths?.trim()) missing.push(t('rd.oseStrong'))
      if (!comment.improvements?.trim()) missing.push(t('rd.oseShort'))
      if (!comment.requiredSkills?.trim()) missing.push(t('rd.oseKnowledge'))
      if (goals.length === 0) missing.push(t('rd.goalMin'))
      if (goals.some(goal => !goal.wig || !goal.kpiCategory?.trim())) missing.push('Every goal requires WIG and KPI category.')
      if (attendance.leaveActualDays == null) missing.push(t('rd.attLeave'))
      if (attendance.lateActualTimes == null) missing.push(t('rd.attLate'))
      if (!attendance.disciplinaryLevel) missing.push(t('rd.attDisc'))
      if (training.minimumHours == null && !pos) missing.push('Training requires minimum hours.')
      if (training.actualHours == null) missing.push('Training requires actual hours.')
      return missing
    }
    const missing: string[] = []
    if (goals.length === 0) missing.push(t('rd.goalMin'))
    if (goals.length > 5) missing.push(t('rd.goalMax'))
    const totalWeight = goals.reduce((sum, goal) => sum + (Number(goal.weight) || 0), 0)
    if (goals.length > 0 && Math.abs(totalWeight - 100) > 0.001) missing.push(t('rd.goalWeight100'))
    goals.forEach((goal, index) => {
      const label = `${t('gs.goal')} ${index + 1}`
      if (!goal.goal.trim()) missing.push(`${label}: ${t('rd.goalRequired')}`)
      if ((Number(goal.weight) || 0) <= 0) missing.push(`${label}: ${t('rd.weightGt0')}`)
      if (goal.evaluationScore == null) missing.push(`${label}: ${t('rd.scoreRequired')}`)
      const targets = [goal.targetRating5, goal.targetRating4, goal.targetRating3, goal.targetRating2, goal.targetRating1]
      if (targets.some(target => !target || !/^\d+(\.\d+)?$/.test(target.trim()))) {
        missing.push(`${label}: ${t('rd.targetNumeric')}`)
      }
      if (!goal.wig) missing.push(`${label}: WIG strategic pillar is required.`)
      if (!goal.kpiCategory?.trim()) missing.push(`${label}: KPI category is required.`)
    })

    if (!pos) {
      missing.push(t('rd.positionRequired'))
    } else {
      const expected = getCompetenciesForPosition(pos).map(c => c.id)
      const scored = new Set(compScores.filter(score => score.score != null).map(score => score.competencyId))
      const missingCompetencies = expected.filter(competencyId => !scored.has(competencyId))
      if (missingCompetencies.length) missing.push(`${t('rd.competencyNeeds')}: ${missingCompetencies.join(', ')}.`)
    }

    if (attendance.leaveActualDays == null) missing.push(t('rd.attLeave'))
    if (attendance.lateActualTimes == null) missing.push(t('rd.attLate'))
    if (!attendance.disciplinaryLevel) missing.push(t('rd.attDisc'))
    if (training.minimumHours == null && !pos) missing.push('Training requires minimum hours.')
    if (training.actualHours == null) missing.push('Training requires actual hours.')
    if (!comment.strengths?.trim()) missing.push(t('rd.cmStrengths'))
    if (!comment.improvements?.trim()) missing.push(t('rd.cmImprove'))
    if (!comment.requiredSkills?.trim()) missing.push(t('rd.cmSkills'))
    return missing
  }, [attendance, comment, compScores, goals, pos, t, isOse, formDef, training])
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
          <h1 style={{ fontSize: 'clamp(2rem, 3.3vw, 3.5rem)' }}>{dash(displayName)}</h1>
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
        <EvaluationExportMenu evaluationId={ev.id} employeeName={displayName} />
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
                  : `${readinessMissing.length} ${t('rd.itemsToComplete')}`}
              </p>
              {!isRequirementReady && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--kbt-text-2)', fontSize: '0.78rem', lineHeight: 1.55 }}>
                  {readinessMissing.slice(0, 6).map(item => <li key={item}>{item}</li>)}
                  {readinessMissing.length > 6 && <li>{readinessMissing.length - 6} {t('rd.moreItems')}</li>}
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
            {sections.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={`kbt-section-tab${section === item.id ? ' active' : ''}`}>
                <span>{item.num}</span>{t(item.key)}
              </button>
            ))}
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'info' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">{numOf('info')} · {t('ef.title.info')}</span></div>
              <div className="kbt-card-body">
                <div className="amw-grid-2" style={{ gap: '16px 32px' }}>
                  {[
                    ...(isOse ? [] : [[t('ef.fld.employee'), ev.evaluatee?.name]] as [string, string | null | undefined][]),
                    [t('table.department'), ev.evaluatee?.department],
                    [t('acc.position'), pos ? POSITION_LABELS[pos] : '-'],
                    ...(isOse ? [[t('ef.fld.hireDate'), evHireDate ? formatDate(evHireDate) : '-']] as [string, string][] : []),
                    [t('eval.evaluator'), ev.evaluator?.name],
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

                {isOse && (
                  <div className="amw-grid-2" style={{ gap: '16px 32px', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--kbt-border)' }}>
                    <div>
                      <label className="kbt-label kbt-label-required">{t('ef.fld.employee')}</label>
                      <input className="kbt-input" disabled={isReadOnly}
                        value={summary.evaluateeName ?? ''}
                        onChange={e => setSummary(s => ({ ...s, evaluateeName: e.target.value }))}
                        placeholder={ev.evaluatee?.name ?? t('ef.fld.employee')} />
                    </div>
                    <div>
                      <label className="kbt-label">{t('ef.fld.evaluatorTitle')}</label>
                      <input className="kbt-input" disabled={isReadOnly}
                        value={summary.evaluatorTitle ?? ''}
                        onChange={e => setSummary(s => ({ ...s, evaluatorTitle: e.target.value }))}
                        placeholder={ev.evaluator?.position ? POSITION_LABELS[ev.evaluator.position] : ''} />
                    </div>
                    <div>
                      <label className="kbt-label">{t('ef.fld.reason')}</label>
                      <div className="amw-reason-row">
                        {EVALUATION_REASONS.map(r => (
                          <button key={r.value} type="button" disabled={isReadOnly}
                            className={`amw-reason-chip${summary.evaluationReason === r.value ? ' active' : ''}`}
                            onClick={() => setSummary(s => ({ ...s, evaluationReason: r.value }))}>
                            {locale === 'th' ? r.th : r.en}
                          </button>
                        ))}
                      </div>
                      {summary.evaluationReason === 'OTHER' && (
                        <input className="kbt-input" disabled={isReadOnly} style={{ marginTop: 8 }}
                          value={summary.evaluationReasonOther ?? ''}
                          onChange={e => setSummary(s => ({ ...s, evaluationReasonOther: e.target.value }))}
                          placeholder={t('ef.fld.reasonOther')} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'rating' && isOse && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">{numOf('rating')} · {t('ef.title.rating')}</span></div>
              <div className="kbt-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="amw-ose-scale-row">
                  {formDef.ratingScale.map(r => (
                    <div key={r.score} className="amw-ose-scale-chip">
                      <span className="kbt-rating-chip">{r.score}</span>
                      <strong>{locale === 'th' ? r.th : r.en}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="kbt-table">
                    <thead>
                      <tr><th style={{ width: 60 }}>{t('ef.grade')}</th><th>Definition (EN)</th><th>คำอธิบาย (TH)</th></tr>
                    </thead>
                    <tbody>
                      {formDef.gradeScale.map(g => (
                        <tr key={g.value}>
                          <td style={{ textAlign: 'center' }}>
                            <span className="kbt-rating-chip">{g.value}</span>
                            <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.66rem', marginTop: 6 }}>{g.en}</p>
                          </td>
                          <td><strong>{g.en}</strong><p style={{ color: 'var(--kbt-text-2)', fontSize: '0.75rem', marginTop: 4 }}>{g.definitionEn}</p></td>
                          <td><strong>{g.th}</strong><p style={{ color: 'var(--kbt-text-2)', fontSize: '0.75rem', marginTop: 4 }}>{g.definitionTh}</p></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {section === 'rating' && !isOse && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">{numOf('rating')} · {t('ef.title.rating')}</span></div>
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
              <div className="kbt-card-header"><span className="kbt-card-title">{numOf('instruction')} · {t('ef.sec.instruction')}</span></div>
              <div className="kbt-card-body">
                {(isOse
                  ? [t('ef.ins1'), t('ef.oseIns2'), t('ef.oseIns3'), t('ef.oseIns4'), t('ef.ins6')]
                  : [
                      t('ef.ins1'), t('ef.ins2'), t('ef.ins3'), t('ef.ins4'),
                      `${t('ef.fld.goal')} (${ev.goalWeight}%) · ${t('ef.sec.competency')} (${ev.competencyWeight}%) · ${t('ef.sec.attendance')} (${ev.attendanceWeight}%)`,
                      t('ef.ins6'),
                    ]
                ).map((text, index) => (
                  <div key={text} className="kbt-instruction-row">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'evaluation' && (
            <SectionCard title={`${numOf('evaluation')} · ${t('ef.sec.evaluation')}`}>
              <OseEvaluationSection def={formDef} scores={compScores} readOnly={isReadOnly} onChange={setCompScores} />
            </SectionCard>
          )}

          {section === 'goals' && <SectionCard title={`${numOf('goals')} · ${t('ef.sec.goals')}`}><GoalSettingSection goals={goals} readOnly={isReadOnly} onChange={setGoals} /></SectionCard>}
          {section === 'competency' && <SectionCard title={`${numOf('competency')} · ${t('ef.title.competency')} (${ev.competencyWeight}%)`}><CompetencySection position={pos} scores={compScores} readOnly={isReadOnly} onChange={setCompScores} /></SectionCard>}
          {section === 'attendance' && <SectionCard title={`${numOf('attendance')} · ${t('ef.sec.attendance')}`}><AttendanceSection data={attendance} readOnly={isReadOnly} onChange={setAttendance} /></SectionCard>}
          {section === 'training' && <SectionCard title={`${numOf('training')} · ${t('ef.sec.training')}`}><TrainingSection data={training} position={pos} readOnly={isReadOnly} onChange={setTraining} /></SectionCard>}
          {section === 'comment' && <SectionCard title={`${numOf('comment')} · ${t('ef.sec.comment')}`}><CommentSection data={comment} readOnly={isReadOnly} onChange={setComment} /></SectionCard>}

          {section === 'summary' && isOse && (
            <SectionCard title={`${numOf('summary')} · ${t('ef.osePerfSummary')}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kbt-label">{t('ef.osePerfSummary')}</label>
                  <div className="amw-grade-grid">
                    {formDef.gradeScale.map(g => (
                      <button key={g.value} type="button" disabled={isReadOnly}
                        className={`amw-grade-chip${summary.performanceGrade === g.key ? ' active' : ''}`}
                        onClick={() => setSummary(s => ({ ...s, performanceGrade: g.key }))}>
                        <strong>{g.value}</strong>
                        <span>{locale === 'th' ? g.th : g.en}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ maxWidth: 240 }}>
                  <label className="kbt-label">{t('ef.effectiveDate')}</label>
                  <input type="date" className="kbt-input" disabled={isReadOnly}
                    value={summary.effectiveDate ?? ''}
                    onChange={e => setSummary(s => ({ ...s, effectiveDate: e.target.value || null }))} />
                </div>
              </div>
            </SectionCard>
          )}

          {section === 'summary' && !isOse && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">{numOf('summary')} · {t('ef.title.summary')}</span></div>
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
