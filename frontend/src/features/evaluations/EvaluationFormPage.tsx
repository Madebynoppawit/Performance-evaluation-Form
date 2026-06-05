import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckSquare, ChevronRight, FileCheck2, Loader2, Save, Scale, ScrollText, Send, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import type { AttendanceScore, CompetencyScore, Evaluation, EvaluationComment, GoalEntry, SalarySummary } from '@/types'
import { formatDate, getTypeLabel } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { POSITION_LABELS, RATING_SCALE } from './constants/competency'
import GoalSettingSection from './components/GoalSettingSection'
import CompetencySection from './components/CompetencySection'
import AttendanceSection from './components/AttendanceSection'
import CommentSection from './components/CommentSection'
import SalarySummarySection from './components/SalarySummarySection'
import AcknowledgementSection from './components/AcknowledgementSection'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED: { cls: 'kbt-badge-info', label: 'Submitted' },
  REVIEWED: { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED: { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const SECTIONS = [
  { id: 'info', num: '01', label: 'Employee Info' },
  { id: 'rating', num: '02', label: 'Rating Scale' },
  { id: 'instruction', num: '03', label: 'Instructions' },
  { id: 'goals', num: '04', label: 'Goal Setting' },
  { id: 'competency', num: '05', label: 'Competency' },
  { id: 'attendance', num: '06', label: 'Attendance' },
  { id: 'comment', num: '07', label: 'Comment' },
  { id: 'summary', num: '08', label: 'Score Summary' },
  { id: 'salary', num: '09', label: 'Salary & Bonus' },
  { id: 'acknowledge', num: '10', label: 'Acknowledgement' },
]

const dash = (value?: string | number | null) => value ?? '-'

export default function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isAdmin, isManager } = useAuth()

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
      await saveMutation.mutateAsync()
      await api.patch(`/evaluations/${id}/submit`, {})
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      navigate('/evaluations')
    },
  })

  const ackMutation = useMutation({
    mutationFn: (signerType: 'employee' | 'evaluator' | 'director') => api.post(`/evaluations/${id}/acknowledge`, { signerType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', id] }),
  })

  if (isLoading) {
    return (
      <div className="amw-loading-panel">
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading evaluation...
      </div>
    )
  }

  if (!ev) return <div className="kbt-msg-error">Evaluation not found</div>

  const pos = ev.evaluatee?.position
  const factItems = [
    ['Evaluator', ev.evaluator?.name],
    ['Department', ev.evaluatee?.department],
    ['Period End', ev.cycle?.endDate ? formatDate(ev.cycle.endDate) : '-'],
    ['Goal', ev.goalScore != null ? ev.goalScore.toFixed(2) : '-'],
    ['Competency', ev.competencyScore != null ? ev.competencyScore.toFixed(2) : '-'],
    ['Attendance', ev.attendanceScore != null ? ev.attendanceScore.toFixed(2) : '-'],
  ]

  return (
    <div className="kbt-page">
      <nav className="amw-breadcrumb">
        <Link to="/evaluations">Evaluations</Link>
        <ChevronRight size={12} />
        <span>{ev.cycle?.name}</span>
      </nav>

      <section className="amw-studio-hero" style={{ minHeight: 188 }}>
        <div className="amw-hero-copy">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="amw-eyebrow">Corporate Review Record</span>
            <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{STATUS[ev.status]?.label ?? ev.status}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.3vw, 3.5rem)' }}>{ev.evaluatee?.name}</h1>
          <p>
            {ev.cycle?.name} · {getTypeLabel(ev.type)}
            {pos ? ` · ${POSITION_LABELS[pos]}` : ''}
          </p>
          <div className="amw-hero-badges">
            {factItems.slice(0, 3).map(([label, value]) => <span key={label}>{label}: {dash(value)}</span>)}
            <span>AMW standard</span>
          </div>
        </div>
        <div className="amw-hero-actions amw-corporate-stack">
          <div className="amw-corporate-seal amw-corporate-seal--compact">
            <Scale size={22} />
            <span>Legal File</span>
            <strong>{ev.status}</strong>
          </div>
          {ev.totalScore != null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--kbt-text-3)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Score</span>
              <div className="kbt-score-value" style={{ fontSize: '3rem', lineHeight: 1 }}>{ev.totalScore.toFixed(2)}</div>
            </div>
          )}
        </div>
      </section>

      {!isReadOnly && (
        <div className="kbt-card" style={{ padding: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="kbt-btn-outline">
            {saveMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saveMutation.isPending ? 'Saving...' : saved ? 'Saved' : 'Save Draft'}
          </button>
          <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="kbt-btn-primary">
            {submitMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
            {submitMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      <div className="amw-corporate-strip">
        <div>
          <ShieldCheck size={15} />
          <span>Access limited by role</span>
        </div>
        <div>
          <ScrollText size={15} />
          <span>Comments retained as corporate record</span>
        </div>
        <div>
          <FileCheck2 size={15} />
          <span>Submit confirms review checkpoint</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <nav style={{ width: 190, flexShrink: 0 }}>
          <div className="kbt-card" style={{ position: 'sticky', top: 16, padding: 6 }}>
            {SECTIONS.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={`kbt-section-tab${section === item.id ? ' active' : ''}`}>
                <span>{item.num}</span>{item.label}
              </button>
            ))}
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'info' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">01 · Employee Information</span></div>
              <div className="kbt-card-body">
                <div className="amw-grid-2" style={{ gap: '16px 32px' }}>
                  {[
                    ['Employee', ev.evaluatee?.name],
                    ['Evaluator', ev.evaluator?.name],
                    ['Department', ev.evaluatee?.department],
                    ['Position', pos ? POSITION_LABELS[pos] : '-'],
                    ['Evaluation Type', getTypeLabel(ev.type)],
                    ['Cycle', ev.cycle?.name],
                    ['Start Date', ev.cycle?.startDate ? formatDate(ev.cycle.startDate) : '-'],
                    ['End Date', ev.cycle?.endDate ? formatDate(ev.cycle.endDate) : '-'],
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
              <div className="kbt-card-header"><span className="kbt-card-title">02 · Competency Rating Scale (1-5)</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="kbt-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Score</th>
                      <th>Definition</th>
                      <th>Behavior Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RATING_SCALE.map((rating) => (
                      <tr key={rating.score}>
                        <td style={{ textAlign: 'center' }}><span className="kbt-rating-chip">{rating.score}</span></td>
                        <td>
                          <strong>{rating.labelEn}</strong>
                          <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem', marginTop: 2 }}>{rating.definitionEn}</p>
                        </td>
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
              <div className="kbt-card-header"><span className="kbt-card-title">03 · Instructions</span></div>
              <div className="kbt-card-body">
                {[
                  'Complete all sections with accurate and current performance information.',
                  'Goal Setting supports up to 5 SMART goals. Total goal weight should equal 100%.',
                  'Competency scoring is position-based. Use the 1-5 rating scale consistently.',
                  'Attendance scores are calculated from actual leave, late, and disciplinary records.',
                  `Total score combines Goal (${ev.goalWeight}%), Competency (${ev.competencyWeight}%), and Attendance (${ev.attendanceWeight}%).`,
                  'Save Draft while working. Submit only after the evaluation is complete.',
                ].map((text, index) => (
                  <div key={text} className="kbt-instruction-row">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'goals' && <SectionCard title="04 · Goal Setting"><GoalSettingSection goals={goals} readOnly={isReadOnly} onChange={setGoals} /></SectionCard>}
          {section === 'competency' && <SectionCard title={`05 · Core Competency (${ev.competencyWeight}%)`}><CompetencySection position={pos} scores={compScores} readOnly={isReadOnly} onChange={setCompScores} /></SectionCard>}
          {section === 'attendance' && <SectionCard title="06 · Attendance"><AttendanceSection data={attendance} readOnly={isReadOnly} onChange={setAttendance} /></SectionCard>}
          {section === 'comment' && <SectionCard title="07 · Comment"><CommentSection data={comment} readOnly={isReadOnly} onChange={setComment} /></SectionCard>}

          {section === 'summary' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">08 · Score Summary</span></div>
              <div className="kbt-card-body">
                {[
                  { label: 'Goal Setting', weight: ev.goalWeight, score: ev.goalScore },
                  { label: 'Competency', weight: ev.competencyWeight, score: ev.competencyScore },
                  { label: 'Attendance', weight: ev.attendanceWeight, score: ev.attendanceScore },
                ].map(({ label, weight, score }) => (
                  <div key={label} className="kbt-summary-row">
                    <div>
                      <strong>{label}</strong>
                      <span>Weight: {weight}%</span>
                    </div>
                    <span className="kbt-score-value">{score != null ? score.toFixed(2) : '-'}</span>
                  </div>
                ))}
                <div className="kbt-summary-total">
                  <div>
                    <strong>Total Score</strong>
                    <span>{ev.totalScore != null ? scoreBand(ev.totalScore) : 'Pending calculation'}</span>
                  </div>
                  <span className="kbt-score-value" style={{ fontSize: '2.5rem' }}>{ev.totalScore != null ? ev.totalScore.toFixed(2) : '-'}</span>
                </div>
              </div>
            </div>
          )}

          {section === 'salary' && (
            <SectionCard title="09 · Salary & Bonus">
              {isAdmin || isManager
                ? <SalarySummarySection data={salary} readOnly={isReadOnly && !isAdmin} onChange={setSalary} />
                : <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>Only Admin and Manager roles can view this section.</div>}
            </SectionCard>
          )}

          {section === 'acknowledge' && (
            <div className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title">10 · Acknowledgement</span>
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
