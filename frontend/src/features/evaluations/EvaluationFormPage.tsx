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
  PENDING_REVIEW: { cls: 'kbt-badge-orange', label: 'Pending Review' },
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

  const factItems = [
    [t('eval.evaluator'), evaluatorDisplayName],
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
            // Auto-compute grade from live competency score — no manual selection needed.
            const oseScore = liveCompetencyScore(compScores)
            const autoGradeDef = oseScore != null
              ? formDef.gradeScale.find(g => g.value === Math.round(oseScore)) ?? formDef.gradeScale[formDef.gradeScale.length - 1]
              : null
            return (
              <SectionCard title={`${numOf('summary')} · ${t('ef.osePerfSummary')}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Computed score banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 20,
                    padding: 16, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 6 }}>
                        Computed Score
                      </div>
                      <span className="kbt-score-value" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
                        {oseScore != null ? oseScore.toFixed(2) : '—'}
                      </span>
                    </div>
                    {autoGradeDef && (
                      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 20 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 6 }}>
                          Auto Grade
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem',
                            background: 'rgba(92,86,144,0.2)', color: 'var(--m-light-blue)',
                            border: '1.5px solid rgba(150,144,196,0.35)',
                          }}>
                            {autoGradeDef.value}
                          </span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--kbt-text)' }}>
                            {locale === 'th' ? autoGradeDef.th : autoGradeDef.en}
                          </span>
                        </div>
                      </div>
                    )}
                    {oseScore == null && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--kbt-text-3)', fontStyle: 'italic' }}>
                        {t('ef.pendingCalc')}
                      </span>
                    )}
                  </div>

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
              return r ? `${s.toFixed(2)} - ${r.labelEn}` : s.toFixed(2)
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
                        Overall Form Rating
                      </div>
                      <RatingDots score={liveTotal} />
                      <div style={{ marginTop: 8, fontSize: '0.875rem', fontWeight: 700, color: 'var(--kbt-text)' }}>
                        {liveTotal != null ? scoreBand(liveTotal) : <span style={{ color: 'var(--kbt-text-3)', fontStyle: 'italic' }}>{t('ef.pendingCalc')}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 8 }}>
                        Calculated Rating
                      </div>
                      <span className="kbt-score-value" style={{ fontSize: '2.8rem', lineHeight: 1 }}>
                        {liveTotal != null ? liveTotal.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Nested summary table — mirrors PDF Part 5 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Name</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: 220 }}>Rating</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: 140 }}>Weight</th>
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
                            {effectiveGoalW}% of total
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
                            {ev.competencyWeight}% of total
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
                              {score != null ? `${score.toFixed(1)} - ${RATING_SCALE.find(r => r.score === score)?.labelEn ?? ''}` : '—'}
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
                            {ev.attendanceWeight}% of total
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
                            <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', fontStyle: 'italic' }}>not applicable</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: effectiveTrainingW > 0 ? 'var(--m-light-blue)' : 'var(--kbt-text-3)' }}>
                            {effectiveTrainingW}% of total
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
                            Calibration Result
                          </div>
                          <RatingDots score={liveTotal} />
                          <div style={{ marginTop: 8, fontSize: '0.9rem', fontWeight: 700, color: gc ? gc.accent : 'var(--kbt-text-3)' }}>
                            {calibRating ? calibRating.labelEn : <span style={{ fontStyle: 'italic', color: 'var(--kbt-text-3)' }}>{t('ef.pendingCalc')}</span>}
                          </div>
                          {calibRating && (
                            <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>
                              {calibRating.definitionEn}
                            </div>
                          )}
                        </div>

                        {/* Right: Grade number + total score */}
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--kbt-text-3)', marginBottom: 6 }}>
                            Grade
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
                              {calibRating?.score ?? '—'}
                            </span>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                              <span className="kbt-score-value" style={{ fontSize: '1.75rem', color: gc ? gc.accent : 'var(--kbt-text-3)' }}>
                                {liveTotal != null ? liveTotal.toFixed(2) : '—'}
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

function scoreBand(score: number) {
  if (score >= 4.5) return '5 - Role Model'
  if (score >= 3.5) return '4 - Exceeds Expectation'
  if (score >= 2.5) return '3 - Meets Expectation'
  if (score >= 1.5) return '2 - Needs Improvement'
  return '1 - Unsatisfactory'
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
