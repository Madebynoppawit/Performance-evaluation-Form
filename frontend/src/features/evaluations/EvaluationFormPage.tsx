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
import type { TranslationKey } from '@/i18n/translations'
import { getCompetenciesForPosition, POSITION_LABELS, RATING_SCALE } from './constants/competency'
import { getFormDefinition } from './constants/formDefinitions'
import OseEvaluationSection from './components/OseEvaluationSection'
import GoalSettingSection from './components/GoalSettingSection'
import CompetencySection from './components/CompetencySection'
import AttendanceSection from './components/AttendanceSection'
import TrainingSection from './components/TrainingSection'
import CommentSection from './components/CommentSection'
import SalarySummarySection from './components/SalarySummarySection'
import AcknowledgementSection from './components/AcknowledgementSection'
import EvaluationExportMenu from './components/EvaluationExportMenu'


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

function extractApiMessages(err: unknown, fallback: string) {
  const data = (err as {
    response?: {
      data?: {
        message?: string
        details?: { missing?: string[] }
        errors?: Record<string, string[] | string>
      }
    }
  }).response?.data
  if (data?.details?.missing?.length) return data.details.missing
  if (data?.errors) {
    const messages = Object.entries(data.errors).flatMap(([field, value]) => {
      const items = Array.isArray(value) ? value : [value]
      return items.filter(Boolean).map(item => `${field}: ${item}`)
    })
    if (messages.length) return messages
  }
  if (data?.message) return [data.message]
  return [fallback]
}

export default function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isDeveloper, isManager } = useAuth()
  const t = useT()
  const { locale } = useLanguage()

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
    evaluatorName: string | null
    evaluationReason: string | null
    evaluationReasonOther: string | null
    evaluatorTitle: string | null
    performanceGrade: string | null
    effectiveDate: string | null
  }>({ evaluateeName: null, evaluatorName: null, evaluationReason: null, evaluationReasonOther: null, evaluatorTitle: null, performanceGrade: null, effectiveDate: null })
  const [section, setSection] = useState('info')
  const [saved, setSaved] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<string[]>([])
  const [reviewerComment, setReviewerComment] = useState('')

  // Only reset form state when navigating to a DIFFERENT evaluation (id changes).
  // Do NOT reset on every refetch — that wipes data the user is actively editing.
  const evId = ev?.id
  useEffect(() => {
    if (!ev) return
    const e = ev as typeof ev & {
      evaluateeName?: string | null
      evaluatorName?: string | null
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
      evaluatorName: e.evaluatorName ?? null,
      evaluationReason: e.evaluationReason ?? null,
      evaluationReasonOther: e.evaluationReasonOther ?? null,
      evaluatorTitle: e.evaluatorTitle ?? null,
      performanceGrade: e.performanceGrade ?? null,
      effectiveDate: e.effectiveDate ? e.effectiveDate.substring(0, 10) : null,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evId])

  const formDef = getFormDefinition((ev as { formType?: string } | undefined)?.formType)
  // Every position-level appraisal form shares the OSE skeleton (flat rating,
  // no goal setting); the legacy weighted form is the only non-appraisal one.
  const isOse = !formDef.sections.goalSetting
  const sectionIds = isOse ? OSE_SECTIONS : LEGACY_SECTIONS
  const sections = sectionIds.map((id, i) => ({ id, num: String(i + 1).padStart(2, '0'), key: SEC_KEY[id] }))
  const numOf = (id: string) => sections.find(s => s.id === id)?.num ?? ''

  // Reviewer is the manager doing 2nd-stage review on a PENDING_REVIEW evaluation.
  const isReviewer = !!ev?.reviewerId && ev.reviewerId === user?.id && ev.status === 'PENDING_REVIEW'
  const isReadOnly = user?.role === 'ADMIN' || (['SUBMITTED', 'REVIEWED', 'CLOSED', 'PENDING_REVIEW'].includes(ev?.status ?? '') && !isDeveloper)

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
        api.patch(`/evaluations/${id}/summary`, summary),
        ...(isDeveloper || isManager ? [api.patch(`/evaluations/${id}/salary`, salary)] : []),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => {
      setSubmitErrors(extractApiMessages(err, 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'))
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
      setSubmitErrors(extractApiMessages(err, t('rd.submitFailed')))
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => api.patch(`/evaluations/${id}/review`, { reviewerComment: reviewerComment.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      navigate('/evaluations')
    },
  })

  const ackMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string | null }) =>
      api.patch(`/evaluations/${id}/acknowledgement`, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', id] }),
  })

  const pos = ev?.evaluatee?.position
  const positionDisplay = ev?.evaluatee?.jobTitle?.trim() || (pos ? POSITION_LABELS[pos] : '-')
  const evHireDate = (ev?.evaluatee as { hireDate?: string | null } | undefined)?.hireDate ?? null
  const displayName = (isOse && summary.evaluateeName?.trim()) ? summary.evaluateeName.trim() : (ev?.evaluatee?.name ?? '')
  const evaluatorDisplayName = summary.evaluatorName?.trim() || ev?.evaluatorName?.trim() || ev?.evaluator?.name || ''
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
      if (goals.some(goal => !goal.wig)) missing.push('Every goal requires a WIG strategic pillar.')
      if (attendance.leaveActualDays == null) missing.push(t('rd.attLeave'))
      if (attendance.lateActualTimes == null) missing.push(t('rd.attLate'))
      if (!attendance.disciplinaryLevel) missing.push(t('rd.attDisc'))
      if (training.minimumHours == null && !pos) missing.push('Training requires minimum hours.')
      if (training.minimumHours != null && training.actualHours == null) missing.push('Training requires actual hours.')
      return missing
    }
    const missing: string[] = []
    if (goals.length === 0) missing.push(t('rd.goalMin'))
    if (goals.length > 5) missing.push(t('rd.goalMax'))
    const totalGoalWeight = goals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
    if (totalGoalWeight > 70) missing.push(`Total goal weight (${totalGoalWeight}%) ต้องไม่เกิน 70%`)
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
    // Training is optional — only validate if partially filled
    if (training.actualHours != null && training.minimumHours == null) missing.push('Training: minimum hours required when actual hours are entered.')
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

  // Period label derived from the cycle end date: Jan–Jun → mid-year, Jul–Dec → year-end.
  const periodLabel = ev.cycle?.endDate
    ? `${new Date(ev.cycle.endDate).getMonth() <= 5 ? 'midyear' : 'yearend'}${new Date(ev.cycle.endDate).getFullYear()}`
    : '-'

  const factItems = [
    [t('eval.evaluator'), evaluatorDisplayName],
    [t('table.department'), ev.evaluatee?.department],
    [t('ef.period'), periodLabel],
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
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.3vw, 3.5rem)' }}>{dash(displayName)}</h1>
          <p>
            {ev.cycle?.name}
            {positionDisplay !== '-' ? ` · ${positionDisplay}` : ''}
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
            <strong>{periodLabel}</strong>
          </div>
          {ev.totalScore != null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--kbt-text-3)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('ef.totalScore')} ({t('ef.sum.gpa')})</span>
              <div className="kbt-score-value" style={{ fontSize: '3rem', lineHeight: 1 }}>{(ev.totalScore - 1).toFixed(2)}</div>
            </div>
          )}
        </div>
      </section>

      <div className="kbt-card amw-eval-actionbar" style={{ padding: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <EvaluationExportMenu
          evaluationId={ev.id}
          employeeName={displayName}
          onBeforeExport={!isReadOnly ? () => saveMutation.mutateAsync() : undefined}
        />
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

      {/* ── Manager 2nd-stage review panel ───────────────────────────────── */}
      {isReviewer && (
        <div className="kbt-card" style={{
          padding: 20,
          border: '1.5px solid rgba(229,35,33,0.28)',
          background: 'rgba(229,35,33,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(229,35,33,0.12)', border: '1px solid rgba(229,35,33,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckSquare size={15} color="var(--amw-red)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--kbt-text)' }}>MD / Director Review</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>
                Review the supervisor's assessment and feedback above, then add your remarks before approving.
              </div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 99, fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(229,35,33,0.12)', color: 'var(--amw-red)' }}>
              PENDING YOUR REVIEW
            </span>
          </div>
          <textarea
            className="kbt-textarea"
            rows={4}
            placeholder="MD / Director remarks (optional) — observations on the supervisor's assessment, any adjustments, final approval notes…"
            value={reviewerComment}
            onChange={e => setReviewerComment(e.target.value)}
            style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => navigate('/evaluations')} className="kbt-btn-ghost" style={{ height: 38 }}>
              Review later
            </button>
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="kbt-btn-primary"
              style={{ height: 38 }}
            >
              {reviewMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {reviewMutation.isPending ? 'Submitting review…' : 'Approve & Submit'}
            </button>
          </div>
        </div>
      )}

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
              background: isRequirementReady ? 'rgba(46,42,94,0.14)' : 'rgba(229,35,33,0.1)',
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
                    [t('acc.position'), positionDisplay],
                    ...(isOse ? [[t('ef.fld.hireDate'), evHireDate ? formatDate(evHireDate) : '-']] as [string, string][] : []),
                    [t('eval.evaluator'), evaluatorDisplayName],
                    [t('ef.period'), periodLabel],
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

                {!isOse && (
                  <div className="amw-grid-2" style={{ gap: '16px 32px', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--kbt-border)' }}>
                    <div>
                      <label className="kbt-label">{t('eval.evaluator')}</label>
                      <input className="kbt-input" disabled={isReadOnly}
                        value={summary.evaluatorName ?? ''}
                        onChange={e => setSummary(s => ({ ...s, evaluatorName: e.target.value }))}
                        placeholder={ev.evaluatorName ?? ev.evaluator?.name ?? t('eval.evaluator')} />
                    </div>
                  </div>
                )}

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
                      <label className="kbt-label">{t('eval.evaluator')}</label>
                      <input className="kbt-input" disabled={isReadOnly}
                        value={summary.evaluatorName ?? ''}
                        onChange={e => setSummary(s => ({ ...s, evaluatorName: e.target.value }))}
                        placeholder={ev.evaluatorName ?? ev.evaluator?.name ?? t('eval.evaluator')} />
                    </div>
                    <div>
                      <label className="kbt-label">{t('ef.fld.evaluatorTitle')}</label>
                      <input className="kbt-input" disabled={isReadOnly}
                        value={summary.evaluatorTitle ?? ''}
                        onChange={e => setSummary(s => ({ ...s, evaluatorTitle: e.target.value }))}
                        placeholder={ev.evaluator?.position ? POSITION_LABELS[ev.evaluator.position] : ''} />
                    </div>
                    <div>
                      <label className="kbt-label">{t('ef.period')}</label>
                      <input className="kbt-input" disabled value={periodLabel} />
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
                      `${t('ef.fld.goal')} (60-70%) · ${t('ef.sec.competency')} (${ev.competencyWeight}%) · ${t('ef.sec.attendance')} (${ev.attendanceWeight}%) · ${t('ef.sec.training')} (10%, if applicable)`,
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
          {section === 'attendance' && <SectionCard title={`${numOf('attendance')} · ${t('ef.sec.attendance')} (${ev.attendanceWeight}%)`}><AttendanceSection data={attendance} readOnly={isReadOnly} onChange={setAttendance} /></SectionCard>}
          {section === 'training' && <SectionCard title={`${numOf('training')} · ${t('ef.sec.training')} (${liveTrainingScore(training) != null ? 10 : 0}%)`}><TrainingSection data={training} position={pos} readOnly={isReadOnly} onChange={setTraining} /></SectionCard>}
          {section === 'comment' && <SectionCard title={`${numOf('comment')} · ${t('ef.sec.comment')}`}><CommentSection data={comment} readOnly={isReadOnly} onChange={setComment} /></SectionCard>}

          {section === 'summary' && isOse && (() => {
            // Score map keyed by criterion / competency id.
            const scoreMap: Record<string, number | null> = Object.fromEntries(compScores.map(s => [s.competencyId, s.score ?? null]))

            // Evaluation = the 6 form-definition categories (main competency bucket).
            const oseCategories = formDef.categories
            const evalCriteriaIds = oseCategories.flatMap(c => c.criteria.map(cr => cr.id))
            const evalScores = evalCriteriaIds.map(id => scoreMap[id]).filter((s): s is number => s != null)
            const evalRaw = evalScores.length ? evalScores.reduce((a, b) => a + b, 0) / evalScores.length : null

            // Competency = position-based CCs (informational only, 0% weight).
            const competencyDefs = pos ? getCompetenciesForPosition(pos) : []
            const ccScores = competencyDefs.map(c => scoreMap[c.id]).filter((s): s is number => s != null)
            const compRaw = ccScores.length ? ccScores.reduce((a, b) => a + b, 0) / ccScores.length : null

            const goalRaw  = liveGoalScore(goals)
            const attRaw   = liveAttendanceScore(attendance)
            const trainRaw = liveTrainingScore(training)

            // Weighting (Evaluation carries competencyWeight; goal absorbs the remainder).
            const effectiveTrainingW = trainRaw != null ? 10 : 0
            const competencyW = ev.competencyWeight
            const attendanceW = ev.attendanceWeight
            const effectiveGoalW = 100 - competencyW - attendanceW - effectiveTrainingW

            const need = (w: number, v: number | null) => w <= 0 || v != null
            const allPresent = need(effectiveGoalW, goalRaw) && need(competencyW, evalRaw) && need(attendanceW, attRaw) && need(effectiveTrainingW, trainRaw)
            const weightedTotal = allPresent
              ? ((goalRaw ?? 0) * effectiveGoalW + (evalRaw ?? 0) * competencyW + (attRaw ?? 0) * attendanceW + (trainRaw ?? 0) * effectiveTrainingW) / 100
              : null
            // Final grade is GPA-style (0–4): per-item ratings stay 1–5, the calculated grade = score − 1.
            const gpa = weightedTotal != null ? weightedTotal - 1 : null

            // Band label from the form's grade scale (reads like HR4U: Excellent / Meet Standard / …).
            const bandLabel = (s: number | null) => {
              if (s == null) return '—'
              const g = formDef.gradeScale.find(g => g.value === Math.round(s)) ?? formDef.gradeScale[formDef.gradeScale.length - 1]
              return locale === 'th' ? g.th : locale === 'fr' ? g.fr : g.en
            }
            const rowRating = (s: number | null) => s == null ? '—' : `${s.toFixed(2)} - ${bandLabel(s)}`
            const pct = (w: number) => `${w.toFixed(1)}%`

            const RatingDots = ({ score }: { score: number | null }) => (
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} style={{
                    width: 13, height: 13, borderRadius: '50%',
                    background: score != null && i <= Math.round(score) ? '#f4a21e' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${score != null && i <= Math.round(score) ? '#f4a21e' : 'rgba(255,255,255,0.15)'}`,
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            )

            const labelStyle: React.CSSProperties = {
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--kbt-text-3)',
            }
            const thStyle: React.CSSProperties = {
              padding: '9px 12px', fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--kbt-text-3)',
              borderBottom: '1px solid var(--kbt-border)',
            }
            const sectionRowStyle: React.CSSProperties = {
              background: 'rgba(92,86,144,0.09)', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }
            const subRowStyle: React.CSSProperties = { borderBottom: '1px solid rgba(255,255,255,0.03)' }
            const nameTd: React.CSSProperties = { padding: '7px 12px 7px 30px', fontSize: '0.8125rem', color: 'var(--kbt-text-2)' }
            const ratingTd: React.CSSProperties = { padding: '7px 12px', fontSize: '0.8125rem' }
            const weightTd: React.CSSProperties = { padding: '7px 12px', textAlign: 'right', fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--kbt-text-2)' }

            // Detail-card styles (HR4U pages 1–10 per-item detail).
            const detailTitle: React.CSSProperties = { fontSize: '1rem', fontWeight: 800, color: 'var(--kbt-text)', letterSpacing: '0.02em', marginTop: 8 }
            const detailCard: React.CSSProperties = { padding: 20, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }
            const detailDesc: React.CSSProperties = { marginTop: 10, fontSize: '0.9rem', color: 'var(--kbt-text-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }
            const commentBlock: React.CSSProperties = { marginTop: 12 }
            const commentText: React.CSSProperties = { marginTop: 4, fontSize: '0.9rem', color: 'var(--kbt-text-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }
            const badgeDone: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(46,200,180,0.12)', color: '#2ec8b4', border: '1px solid rgba(46,200,180,0.3)' }
            const badgeTodo: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'var(--kbt-text-3)', border: '1px solid rgba(255,255,255,0.1)' }

            /* HR4U section header row: bold name | section avg (plain number) | weight.
               showLabel=true appends the band label when the section has no sub-rows. */
            const SecHeader = ({ name, score, weightText, showLabel = false }: { name: string; score: number | null; weightText: string; showLabel?: boolean }) => (
              <tr style={sectionRowStyle}>
                <td style={{ padding: '11px 12px' }}><strong style={{ fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{name}</strong></td>
                <td style={{ padding: '11px 12px', fontSize: '0.8125rem', fontWeight: 700, color: score != null ? 'var(--kbt-text)' : 'var(--kbt-text-3)' }}>
                  {score == null ? '—' : showLabel ? rowRating(score) : score.toFixed(2)}
                </td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--kbt-text-3)' }}>{weightText}</td>
              </tr>
            )

            return (
              <SectionCard title={`${numOf('summary')} · ${t('ef.osePerfSummary')}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Top block — HR4U Part 5 header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
                    padding: 18, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div>
                      <div style={labelStyle}>{t('ef.sum.overallRating')}:</div>
                      <div style={{ marginTop: 10 }}><RatingDots score={weightedTotal} /></div>
                      <div style={{ marginTop: 10, fontSize: '0.9rem', fontWeight: 800, color: 'var(--kbt-text)' }}>
                        {gpa != null
                          ? `${Math.round(gpa)}: ${bandLabel(weightedTotal)}`
                          : <span style={{ color: 'var(--kbt-text-3)', fontStyle: 'italic', fontWeight: 600 }}>{t('ef.pendingCalc')}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={labelStyle}>{t('ef.sum.adjustedRating')}:</div>
                      <div style={{ marginTop: 6, fontSize: '0.95rem', fontWeight: 700, color: 'var(--kbt-text)' }}>
                        {gpa != null ? `${Math.round(gpa)}.0 - ${bandLabel(weightedTotal)}` : '—'}
                      </div>
                      <div style={{ ...labelStyle, marginTop: 14 }}>{t('ef.sum.calculatedRating')}:</div>
                      <span className="kbt-score-value" style={{ fontSize: '2.4rem', lineHeight: 1.15 }}>
                        {gpa != null ? gpa.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Summary table — Name | Rating | Weight (HR4U Part 5) */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>{t('ef.sum.name')}</th>
                        <th style={{ ...thStyle, textAlign: 'left', width: 240 }}>{t('ef.sum.rating')}</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: 150 }}>{t('ef.sum.weight')}</th>
                      </tr>
                    </thead>
                    <tbody>

                      {/* Goal Setting — Part 2 KPI */}
                      <SecHeader name={t('ef.sec.goals')} score={goalRaw} weightText={`${pct(effectiveGoalW)} ${t('ef.sum.ofTotal')}`} />
                      {goals.map((g, i) => (
                        <tr key={`g${i}`} style={subRowStyle}>
                          <td style={nameTd}>{g.goal || `Goal ${i + 1}`}</td>
                          <td style={{ ...ratingTd, color: g.evaluationScore != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>{rowRating(g.evaluationScore ?? null)}</td>
                          <td style={weightTd}>{pct(Number(g.weight) || 0)}</td>
                        </tr>
                      ))}

                      {/* Evaluation — Part 3 Core Competency */}
                      <SecHeader name={t('ef.sec.evaluation')} score={evalRaw} weightText={`${pct(competencyW)} ${t('ef.sum.ofTotal')}`} />
                      {oseCategories.map(cat => {
                        const catScores = cat.criteria.map(cr => scoreMap[cr.id]).filter((s): s is number => s != null)
                        const catAvg = catScores.length ? catScores.reduce((a, b) => a + b, 0) / catScores.length : null
                        return (
                          <tr key={cat.id} style={subRowStyle}>
                            <td style={nameTd}>{cat.num}. {locale === 'th' ? cat.titleTh : cat.titleEn}</td>
                            <td style={{ ...ratingTd, color: catAvg != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>{rowRating(catAvg)}</td>
                            <td style={{ ...weightTd, color: 'var(--kbt-text-3)' }}>—</td>
                          </tr>
                        )
                      })}

                      {/* Competency — Part 4 Functional (reference, 0%) */}
                      <SecHeader name={t('ef.sec.competency')} score={compRaw} weightText={`0.0% ${t('ef.sum.ofTotal')}`} />
                      {competencyDefs.map(c => {
                        const score = scoreMap[c.id] ?? null
                        const desc = pos ? c.descriptions[pos] : undefined
                        return (
                          <tr key={c.id} style={subRowStyle}>
                            <td style={nameTd}>
                              {c.name}
                              {desc && <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--kbt-text-3)', lineHeight: 1.4 }}>{desc}</p>}
                            </td>
                            <td style={{ ...ratingTd, color: score != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)', verticalAlign: 'top' }}>{rowRating(score)}</td>
                            <td style={{ ...weightTd, color: 'var(--kbt-text-3)', verticalAlign: 'top' }}>—</td>
                          </tr>
                        )
                      })}

                      {/* Attendance & Training — single-metric sections */}
                      <SecHeader name={t('ef.sec.attendance')} score={attRaw} weightText={`${pct(attendanceW)} ${t('ef.sum.ofTotal')}`} showLabel />
                      <SecHeader name={t('ef.sec.training')} score={trainRaw} weightText={`${pct(effectiveTrainingW)} ${t('ef.sum.ofTotal')}`} showLabel />

                    </tbody>
                  </table>

                  {/* ── Detailed breakdown (HR4U pages 1–10 style) ── */}
                  {goals.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={detailTitle}>{t('ef.sec.goals')} — {t('ef.sum.details')}</div>
                      {goals.map((g, i) => {
                        const done = g.evaluationScore != null
                        const targets: [string, string | undefined][] = [['5', g.targetRating5], ['4', g.targetRating4], ['3', g.targetRating3], ['2', g.targetRating2], ['1', g.targetRating1]]
                        const hasTargets = targets.some(([, txt]) => txt && txt.trim())
                        return (
                          <div key={i} style={detailCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '1rem', color: 'var(--kbt-text)', lineHeight: 1.4 }}>{i + 1}. {g.goal || `Goal ${i + 1}`}</strong>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--kbt-text-3)' }}>{pct(Number(g.weight) || 0)} {t('ef.sum.ofTotal')}</span>
                                <span style={done ? badgeDone : badgeTodo}>{done ? t('ef.sum.completed') : t('ef.sum.notStarted')}</span>
                              </div>
                            </div>
                            {g.goalDescription && <p style={detailDesc}>{g.goalDescription}</p>}
                            {hasTargets && (
                              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={labelStyle}>{t('ef.sum.targetsByRating')}</span>
                                {targets.map(([lvl, txt]) => txt && txt.trim() ? (
                                  <div key={lvl} style={{ display: 'flex', gap: 10, fontSize: '0.875rem', color: 'var(--kbt-text-2)', marginTop: 3, lineHeight: 1.5 }}>
                                    <span style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(92,86,144,0.2)', color: 'var(--m-light-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>{lvl}</span>
                                    <span>{txt}</span>
                                  </div>
                                ) : null)}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                              <span style={labelStyle}>{t('ef.sum.rating')}</span>
                              <RatingDots score={g.evaluationScore ?? null} />
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: done ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>{rowRating(g.evaluationScore ?? null)}</span>
                            </div>
                            {g.result && g.result.trim() && (
                              <div style={{ marginTop: 12, fontSize: '0.9rem' }}>
                                <span style={labelStyle}>{t('ef.sum.actualResult')}</span>{' '}
                                <span style={{ color: 'var(--kbt-text-2)' }}>{g.result}</span>
                              </div>
                            )}
                            {g.employeeComment && g.employeeComment.trim() && (
                              <div style={commentBlock}><span style={labelStyle}>{t('ef.sum.employeeComment')}</span><p style={commentText}>{g.employeeComment}</p></div>
                            )}
                            {g.superiorComment && g.superiorComment.trim() && (
                              <div style={commentBlock}><span style={labelStyle}>{t('ef.sum.supervisorComment')}</span><p style={commentText}>{g.superiorComment}</p></div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Attendance & Training detail */}
                  {(attRaw != null || trainRaw != null) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={detailTitle}>{t('ef.sec.attendance')} &amp; {t('ef.sec.training')} — {t('ef.sum.details')}</div>
                      <div style={detailCard}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px', fontSize: '0.9rem' }}>
                          {attendance.leaveActualDays != null && <div><span style={labelStyle}>{t('ef.sum.leaveDays')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{attendance.leaveActualDays}</span></div>}
                          {attendance.lateActualTimes != null && <div><span style={labelStyle}>{t('ef.sum.lateTimes')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{attendance.lateActualTimes}</span></div>}
                          {attendance.disciplinaryLevel && <div><span style={labelStyle}>{t('ef.sum.disciplinary')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{attendance.disciplinaryLevel}</span></div>}
                          {training.minimumHours != null && <div><span style={labelStyle}>{t('ef.sum.trainingMin')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{training.minimumHours}</span></div>}
                          {training.actualHours != null && <div><span style={labelStyle}>{t('ef.sum.trainingActual')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{training.actualHours}</span></div>}
                          {training.behaviorNote && <div style={{ gridColumn: '1 / -1' }}><span style={labelStyle}>{t('ef.sum.behaviorNote')}</span> <span style={{ color: 'var(--kbt-text-2)' }}>{training.behaviorNote}</span></div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Comment — HR4U Part 6 */}
                  {(comment.strengths || comment.improvements || comment.requiredSkills) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={detailTitle}>{t('ef.sum.additionalComment')}</div>
                      <div style={detailCard}>
                        {comment.strengths && <div><span style={labelStyle}>{t('ef.sum.strengths')}</span><p style={commentText}>{comment.strengths}</p></div>}
                        {comment.improvements && <div style={commentBlock}><span style={labelStyle}>{t('ef.sum.improvementArea')}</span><p style={commentText}>{comment.improvements}</p></div>}
                        {comment.requiredSkills && <div style={commentBlock}><span style={labelStyle}>{t('ef.sum.requiredSkills')}</span><p style={commentText}>{comment.requiredSkills}</p></div>}
                      </div>
                    </div>
                  )}

                  <div style={{ maxWidth: 240 }}>
                    <label className="kbt-label">{t('ef.effectiveDate')}</label>
                    <input type="date" className="kbt-input" disabled={isReadOnly}
                      value={summary.effectiveDate ?? ''}
                      onChange={e => setSummary(s => ({ ...s, effectiveDate: e.target.value || null }))} />
                  </div>
                </div>
              </SectionCard>
            )
          })()}

          {section === 'summary' && !isOse && (() => {
            const goalRaw  = liveGoalScore(goals)
            const compRaw  = liveCompetencyScore(compScores)
            const attRaw   = liveAttendanceScore(attendance)
            const trainRaw = liveTrainingScore(training)

            const effectiveTrainingW = trainRaw != null ? 10 : 0
            const effectiveGoalW = 100 - ev.competencyWeight - ev.attendanceWeight - effectiveTrainingW
            const allPresent = goalRaw != null && compRaw != null && attRaw != null
            const liveTotal = allPresent
              ? (goalRaw! * effectiveGoalW + compRaw! * ev.competencyWeight + attRaw! * ev.attendanceWeight + (trainRaw ?? 0) * effectiveTrainingW) / 100
              : null

            const ratingLabel = (s: number | null) => {
              if (s == null) return '—'
              const r = RATING_SCALE.find(r => r.score === Math.round(s))
              return r ? `${s.toFixed(2)} - ${locale === 'th' ? r.labelTh : locale === 'fr' ? r.labelFr : r.labelEn}` : s.toFixed(2)
            }
            const RatingDots = ({ score }: { score: number | null }) => (
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{
                    width: 11, height: 11, borderRadius: '50%',
                    background: score != null && i <= Math.round(score) ? '#f4a21e' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${score != null && i <= Math.round(score) ? '#f4a21e' : 'rgba(255,255,255,0.15)'}`,
                    transition: 'all 0.2s',
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            )

            const competencyDefs = pos ? getCompetenciesForPosition(pos) : []
            const compMap = Object.fromEntries(compScores.map(s => [s.competencyId, s.score ?? null]))

            const thStyle: React.CSSProperties = {
              padding: '8px 12px', fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--kbt-text-3)',
              borderBottom: '1px solid var(--kbt-border)',
            }
            const sectionRowStyle: React.CSSProperties = {
              background: 'rgba(92,86,144,0.07)', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }
            const subRowStyle: React.CSSProperties = {
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }

            return (
              <div className="kbt-card">
                <div className="kbt-card-header"><span className="kbt-card-title">{numOf('summary')} · {t('ef.title.summary')}</span></div>
                <div className="kbt-card-body">

                  {/* Top block: Overall Rating + Calculated Rating */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
                    marginBottom: 20, padding: 16, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 8 }}>
                        {t('ef.sum.overallRating')}
                      </div>
                      <RatingDots score={liveTotal} />
                      <div style={{ marginTop: 8, fontSize: '0.875rem', fontWeight: 700, color: 'var(--kbt-text)' }}>
                        {liveTotal != null ? scoreBand(liveTotal, locale) : <span style={{ color: 'var(--kbt-text-3)', fontStyle: 'italic' }}>{t('ef.pendingCalc')}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 8 }}>
                        {t('ef.sum.calculatedRating')}
                      </div>
                      <span className="kbt-score-value" style={{ fontSize: '2.8rem', lineHeight: 1 }}>
                        {liveTotal != null ? (liveTotal - 1).toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Nested summary table — mirrors PDF Part 5 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>{t('ef.sum.name')}</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: 220 }}>{t('ef.sum.rating')}</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: 140 }}>{t('ef.sum.weight')}</th>
                      </tr>
                    </thead>
                    <tbody>

                      {/* ── Goal Setting ── */}
                      <tr style={sectionRowStyle}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{t('ef.sec.goals')}</strong>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            <RatingDots score={goalRaw} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: goalRaw != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                              {ratingLabel(goalRaw)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--m-light-blue)' }}>
                            {effectiveGoalW}% {t('ef.sum.ofTotal')}
                          </span>
                        </td>
                      </tr>
                      {goals.map((g, i) => (
                        <tr key={i} style={subRowStyle}>
                          <td style={{ padding: '7px 12px 7px 28px', fontSize: '0.8125rem', color: 'var(--kbt-text-2)' }}>
                            {g.goal || `Goal ${i + 1}`}
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'center', fontSize: '0.8125rem', color: g.evaluationScore != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                            {ratingLabel(g.evaluationScore ?? null)}
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--kbt-text-2)' }}>
                            {Number(g.weight) || 0}%
                          </td>
                        </tr>
                      ))}

                      {/* ── Core Competency ── */}
                      <tr style={sectionRowStyle}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{t('ef.sec.competency')}</strong>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            <RatingDots score={compRaw} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: compRaw != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                              {ratingLabel(compRaw)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--m-light-blue)' }}>
                            {ev.competencyWeight}% {t('ef.sum.ofTotal')}
                          </span>
                        </td>
                      </tr>
                      {competencyDefs.map(c => {
                        const score = compMap[c.id] ?? null
                        return (
                          <tr key={c.id} style={subRowStyle}>
                            <td style={{ padding: '7px 12px 7px 28px', fontSize: '0.8125rem', color: 'var(--kbt-text-2)' }}>
                              {c.name}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', fontSize: '0.8125rem', color: score != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                              {score != null ? `${score.toFixed(1)} - ${(locale === 'th' ? RATING_SCALE.find(r => r.score === score)?.labelTh : locale === 'fr' ? RATING_SCALE.find(r => r.score === score)?.labelFr : RATING_SCALE.find(r => r.score === score)?.labelEn) ?? ''}` : '—'}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--kbt-text-3)' }}>—</td>
                          </tr>
                        )
                      })}

                      {/* ── Attendance ── */}
                      <tr style={sectionRowStyle}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{t('ef.sec.attendance')}</strong>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            <RatingDots score={attRaw} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: attRaw != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                              {ratingLabel(attRaw)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--m-light-blue)' }}>
                            {ev.attendanceWeight}% {t('ef.sum.ofTotal')}
                          </span>
                        </td>
                      </tr>

                      {/* ── Training ── */}
                      <tr style={sectionRowStyle}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--kbt-text)' }}>{t('ef.sec.training')}</strong>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {effectiveTrainingW > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                              <RatingDots score={trainRaw} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trainRaw != null ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>
                                {ratingLabel(trainRaw)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', fontStyle: 'italic' }}>{t('ef.sum.notApplicable')}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: effectiveTrainingW > 0 ? 'var(--m-light-blue)' : 'var(--kbt-text-3)' }}>
                            {effectiveTrainingW}% {t('ef.sum.ofTotal')}
                          </span>
                        </td>
                      </tr>

                    </tbody>
                  </table>

                  {/* ── Calibration block ── */}
                  {(() => {
                    const calibRating = liveTotal != null ? RATING_SCALE.find(r => r.score === Math.round(liveTotal)) ?? RATING_SCALE[RATING_SCALE.length - 1] : null
                    const GRADE_COLOR: Record<number, { bg: string; accent: string; border: string }> = {
                      5: { bg: 'rgba(150,144,196,0.12)', accent: 'var(--m-light-blue)',  border: 'rgba(150,144,196,0.35)' },
                      4: { bg: 'rgba(92,86,144,0.14)',   accent: '#9696d0',              border: 'rgba(92,86,144,0.4)' },
                      3: { bg: 'rgba(46,200,180,0.10)',  accent: '#2ec8b4',              border: 'rgba(46,200,180,0.35)' },
                      2: { bg: 'rgba(234,128,0,0.10)',   accent: '#ea8000',              border: 'rgba(234,128,0,0.35)' },
                      1: { bg: 'rgba(229,35,33,0.10)',   accent: 'var(--amw-red)',       border: 'rgba(229,35,33,0.35)' },
                    }
                    const gc = calibRating ? GRADE_COLOR[calibRating.score] : null

                    return (
                      <div style={{
                        marginTop: 16, padding: 20, borderRadius: 10,
                        background: gc ? gc.bg : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${gc ? gc.border : 'rgba(255,255,255,0.07)'}`,
                        display: 'flex', alignItems: 'center', gap: 24,
                      }}>
                        {/* Left: label */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: gc ? gc.accent : 'var(--kbt-text-3)', marginBottom: 6 }}>
                            {t('ef.sum.calibrationResult')}
                          </div>
                          <RatingDots score={liveTotal} />
                          <div style={{ marginTop: 8, fontSize: '0.9rem', fontWeight: 700, color: gc ? gc.accent : 'var(--kbt-text-3)' }}>
                            {calibRating ? (locale === 'th' ? calibRating.labelTh : locale === 'fr' ? calibRating.labelFr : calibRating.labelEn) : <span style={{ fontStyle: 'italic', color: 'var(--kbt-text-3)' }}>{t('ef.pendingCalc')}</span>}
                          </div>
                          {calibRating && (
                            <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>
                              {locale === 'th' ? calibRating.definitionTh : locale === 'fr' ? calibRating.definitionFr : calibRating.definitionEn}
                            </div>
                          )}
                        </div>

                        {/* Right: Grade number + total score */}
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 6 }}>
                            {t('ef.sum.grade')}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, justifyContent: 'center' }}>
                            <span style={{
                              width: 56, height: 56, borderRadius: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'monospace', fontWeight: 900, fontSize: '1.8rem',
                              background: gc ? gc.bg : 'rgba(255,255,255,0.04)',
                              color: gc ? gc.accent : 'var(--kbt-text-3)',
                              border: `2px solid ${gc ? gc.border : 'rgba(255,255,255,0.1)'}`,
                            }}>
                              {calibRating ? calibRating.score - 1 : '—'}
                            </span>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                              <span className="kbt-score-value" style={{ fontSize: '1.75rem', color: gc ? gc.accent : 'var(--kbt-text-3)' }}>
                                {liveTotal != null ? (liveTotal - 1).toFixed(2) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })()}

          {section === 'salary' && (
            <SectionCard title={`09 · ${t('ef.sec.salary')}`}>
              {isDeveloper || isManager
                ? <SalarySummarySection data={salary} readOnly={isReadOnly} onChange={setSalary} />
                : <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>{t('ef.salaryRestricted')}</div>}
            </SectionCard>
          )}

          {section === 'acknowledge' && (
            <div className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title">{numOf('acknowledge')} · {t('ef.sec.acknowledge')}</span>
                <CheckSquare size={16} color="var(--kbt-text-3)" />
              </div>
              <div className="kbt-card-body">
                <AcknowledgementSection
                  data={ev.acknowledgement}
                  isAdmin={isDeveloper || isManager}
                  currentUserId={user?.id}
                  evaluatorId={ev.evaluatorId}
                  onUpdate={(field, value) => ackMutation.mutate({ field, value })}
                  isUpdating={ackMutation.isPending}
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

function scoreBand(score: number, locale: 'en' | 'th' | 'fr' = 'en') {
  const r = RATING_SCALE.find(x => x.score === Math.round(score)) ?? RATING_SCALE[RATING_SCALE.length - 1]
  const label = locale === 'th' ? r.labelTh : locale === 'fr' ? r.labelFr : r.labelEn
  return `${r.score} - ${label}`
}

// ── Live score helpers (mirror backend service formulas) ─────────────────────

function liveGoalScore(goals: GoalEntry[]): number | null {
  const scored = goals.filter(g => g.evaluationScore != null)
  if (!scored.length) return null
  const totalW = scored.reduce((s, g) => s + (Number(g.weight) || 0), 0)
  if (totalW === 0) return null
  return scored.reduce((s, g) => s + (g.evaluationScore! * (Number(g.weight) || 0)), 0) / totalW
}

function liveCompetencyScore(scores: CompetencyScore[]): number | null {
  const valid = scores.filter(s => s.score != null)
  if (!valid.length) return null
  return valid.reduce((s, c) => s + c.score!, 0) / valid.length
}

function liveAttendanceScore(data: AttendanceScore): number | null {
  function leaveS(d: number) { return d === 0 ? 5 : d <= 2 ? 4 : d <= 4 ? 3 : d <= 6 ? 2 : 1 }
  function lateS(t: number) { return t <= 3 ? 5 : t <= 5 ? 4 : t <= 7 ? 3 : t <= 9 ? 2 : 1 }
  function discS(l: string) { return l === 'NONE' ? 5 : l === 'VERBAL_WARNING_1' || l === 'WRITTEN_WARNING_1' ? 2 : 1 }
  const parts: number[] = []
  if (data.leaveActualDays != null) parts.push(leaveS(data.leaveActualDays))
  if (data.lateActualTimes != null) parts.push(lateS(data.lateActualTimes))
  if (data.disciplinaryLevel) parts.push(discS(data.disciplinaryLevel))
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null
}

function liveTrainingScore(data: TrainingScore): number | null {
  const min = data.minimumHours ?? null
  const act = data.actualHours ?? null
  if (min == null || act == null || min <= 0) return null
  const pct = (act / min) * 100
  return pct >= 130 ? 5 : pct >= 110 ? 4 : pct >= 100 ? 3 : pct >= 70 ? 2 : 1
}
