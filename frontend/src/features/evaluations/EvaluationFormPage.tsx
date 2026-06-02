import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Save, Send, CheckSquare, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import type { Evaluation, GoalEntry, CompetencyScore, AttendanceScore, EvaluationComment, SalarySummary } from '@/types'
import { formatDate, getTypeLabel } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { RATING_SCALE, POSITION_LABELS } from './constants/competency'
import GoalSettingSection from './components/GoalSettingSection'
import CompetencySection from './components/CompetencySection'
import AttendanceSection from './components/AttendanceSection'
import CommentSection from './components/CommentSection'
import SalarySummarySection from './components/SalarySummarySection'
import AcknowledgementSection from './components/AcknowledgementSection'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT:       { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED:   { cls: 'kbt-badge-info',    label: 'Submitted' },
  REVIEWED:    { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED:      { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const SECTIONS = [
  { id: 'info',        num: '01', label: 'Employee Info' },
  { id: 'rating',      num: '02', label: 'Rating Scale' },
  { id: 'instruction', num: '03', label: 'Instructions' },
  { id: 'goals',       num: '04', label: 'Goal Setting' },
  { id: 'competency',  num: '05', label: 'Competency' },
  { id: 'attendance',  num: '06', label: 'Attendance' },
  { id: 'comment',     num: '07', label: 'Comment' },
  { id: 'summary',     num: '08', label: 'Score Summary' },
  { id: 'salary',      num: '09', label: 'Salary & Bonus' },
  { id: 'acknowledge', num: '10', label: 'Acknowledgement' },
]

export default function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, isAdmin, isManager } = useAuth()

  const { data: ev, isLoading } = useQuery<Evaluation>({
    queryKey: ['evaluations', id],
    queryFn: () => api.get(`/evaluations/${id}`).then(r => r.data),
  })

  const [goals,      setGoals]      = useState<GoalEntry[]>([])
  const [compScores, setCompScores] = useState<CompetencyScore[]>([])
  const [attendance, setAttendance] = useState<AttendanceScore>({ disciplinaryLevel: 'NONE' })
  const [comment,    setComment]    = useState<EvaluationComment>({})
  const [salary,     setSalary]     = useState<SalarySummary>({})
  const [section,    setSection]    = useState('info')
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    if (!ev) return
    setGoals(ev.goalEntries ?? [])
    setCompScores(ev.competencyScores ?? [])
    setAttendance(ev.attendanceRecord ?? { disciplinaryLevel: 'NONE' })
    setComment(ev.comment ?? {})
    setSalary(ev.salarySummary ?? {})
  }, [ev])

  const isReadOnly = ['SUBMITTED','REVIEWED','CLOSED'].includes(ev?.status ?? '') && !isAdmin

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.patch(`/evaluations/${id}/goals`,      { goals }),
        api.patch(`/evaluations/${id}/competency`, { scores: compScores }),
        api.patch(`/evaluations/${id}/attendance`, attendance),
        api.patch(`/evaluations/${id}/comment`,    comment),
        ...(isAdmin || isManager ? [api.patch(`/evaluations/${id}/salary`, salary)] : []),
      ])
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations', id] }); setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  const submitMutation = useMutation({
    mutationFn: async () => { await saveMutation.mutateAsync(); await api.patch(`/evaluations/${id}/submit`, {}) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); navigate('/evaluations') },
  })

  const ackMutation = useMutation({
    mutationFn: (signerType: 'employee' | 'evaluator' | 'director') => api.post(`/evaluations/${id}/acknowledge`, { signerType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations', id] }),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#4b5563', gap: 10, fontSize: '0.875rem' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading evaluation...
    </div>
  )
  if (!ev) return <div className="kbt-msg-error">ไม่พบแบบประเมิน</div>

  const pos = ev.evaluatee?.position

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#4b5563' }}>
        <Link to="/evaluations" style={{ color: '#00c87a', textDecoration: 'none' }}>Evaluations</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#94a3b8' }}>{ev.cycle?.name}</span>
      </nav>

      {/* Object Header */}
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #00c87a, #3b82f6)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                {ev.evaluatee?.name}
              </h1>
              <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{STATUS[ev.status]?.label ?? ev.status}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
              {ev.cycle?.name} · {getTypeLabel(ev.type)}
              {pos && <> · <span style={{ color: '#94a3b8' }}>{POSITION_LABELS[pos]}</span></>}
            </p>

            {/* Key facts */}
            <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                ['Evaluator',   ev.evaluator?.name],
                ['Department',  ev.evaluatee?.department ?? '—'],
                ['Period',      ev.cycle?.endDate ? formatDate(ev.cycle.endDate) : '—'],
                ['Goal',        ev.goalScore != null        ? ev.goalScore.toFixed(2)        : '—'],
                ['Competency',  ev.competencyScore != null  ? ev.competencyScore.toFixed(2)  : '—'],
                ['Attendance',  ev.attendanceScore != null  ? ev.attendanceScore.toFixed(2)  : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontSize: '0.625rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total score */}
          {ev.totalScore != null && (
            <div style={{
              textAlign: 'center', padding: '14px 20px',
              background: 'rgba(0,200,122,0.05)', border: '1px solid rgba(0,200,122,0.15)',
              borderRadius: 10, flexShrink: 0,
            }}>
              <p style={{
                fontSize: '2.25rem', fontWeight: 800, lineHeight: 1,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {ev.totalScore.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.625rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Total Score</p>
            </div>
          )}
        </div>

        {/* Action bar */}
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="kbt-btn-outline" style={{ gap: 6 }}>
              {saveMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              {saveMutation.isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Draft'}
            </button>
            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="kbt-btn-primary" style={{ gap: 6 }}>
              {submitMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Anchor nav */}
        <nav style={{ width: 180, flexShrink: 0 }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, overflow: 'hidden', position: 'sticky', top: 16,
          }}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', fontSize: '0.8125rem', cursor: 'pointer',
                background: section === s.id ? 'rgba(0,200,122,0.08)' : 'transparent',
                borderLeft: section === s.id ? '2px solid #00c87a' : '2px solid transparent',
                color: section === s.id ? '#00c87a' : '#4b5563',
                fontWeight: section === s.id ? 600 : 400,
                borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.15s',
                textAlign: 'left',
              }}>
                <span style={{
                  fontSize: '0.5625rem', fontFamily: 'monospace', fontWeight: 700,
                  color: section === s.id ? '#00c87a' : '#4b5563', letterSpacing: '0.04em',
                }}>{s.num}</span>
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Section content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 01 Employee Info */}
          {section === 'info' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">01 · Employee Information</span></div>
              <div className="kbt-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                  {[
                    ['ชื่อ-นามสกุล', ev.evaluatee?.name],
                    ['ผู้ประเมิน',    ev.evaluator?.name],
                    ['แผนก',          ev.evaluatee?.department ?? '—'],
                    ['ตำแหน่ง',        pos ? POSITION_LABELS[pos] : '—'],
                    ['ประเภทประเมิน',   getTypeLabel(ev.type)],
                    ['รอบการประเมิน',   ev.cycle?.name ?? '—'],
                    ['วันเริ่มต้น',      ev.cycle?.startDate ? formatDate(ev.cycle.startDate) : '—'],
                    ['วันสิ้นสุด',       ev.cycle?.endDate   ? formatDate(ev.cycle.endDate)   : '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: '0.9375rem', color: '#e2e8f0', fontWeight: 500 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 02 Rating Scale */}
          {section === 'rating' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">02 · Competency Rating Scale (1–5)</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="kbt-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Score</th>
                      <th>Definition EN</th>
                      <th>คำอธิบาย TH</th>
                      <th>Behavior Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RATING_SCALE.map((r) => (
                      <tr key={r.score}>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 6, fontWeight: 800, fontSize: '0.875rem',
                            fontFamily: 'monospace',
                            background: r.score >= 4 ? 'rgba(0,200,122,0.15)' : r.score === 3 ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                            color: r.score >= 4 ? '#00c87a' : r.score === 3 ? '#3b82f6' : '#f59e0b',
                            border: `1px solid ${r.score >= 4 ? 'rgba(0,200,122,0.25)' : r.score === 3 ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
                          }}>
                            {r.score}
                          </span>
                        </td>
                        <td>
                          <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>{r.labelEn}</p>
                          <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: 2 }}>{r.definitionEn}</p>
                        </td>
                        <td>
                          <p style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.875rem' }}>{r.labelTh}</p>
                          <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: 2 }}>{r.definitionTh}</p>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#4b5563' }}>{r.indicatorTh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 03 Instructions */}
          {section === 'instruction' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">03 · Instructions</span></div>
              <div className="kbt-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'กรอกข้อมูลให้ครบถ้วนและตรงตามความเป็นจริง',
                    `Goal Setting: ตั้ง SMART Goal ได้ไม่เกิน 5 หัวข้อ น้ำหนักรวมต้องได้ 100%`,
                    'Competency: ข้อมูล fix ตามตำแหน่ง ผู้ประเมินให้คะแนน 1–5',
                    'Attendance: กรอกตัวเลขจริง ระบบคำนวณ Score อัตโนมัติ',
                    `สูตรคะแนนรวม = Goal (${ev.goalWeight}%) + Competency (${ev.competencyWeight}%) + Attendance (${ev.attendanceWeight}%)`,
                    'Save Draft ก่อนออกจากหน้า จากนั้น Submit เมื่อกรอกครบ',
                  ].map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(0,200,122,0.1)', border: '1px solid rgba(0,200,122,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, color: '#00c87a', fontFamily: 'monospace',
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6 }}>{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'goals' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">04 · Goal Setting</span></div>
              <div className="kbt-card-body"><GoalSettingSection goals={goals} readOnly={isReadOnly} onChange={setGoals} /></div>
            </div>
          )}
          {section === 'competency' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">05 · Core Competency ({ev.competencyWeight}%)</span></div>
              <div className="kbt-card-body"><CompetencySection position={pos} scores={compScores} readOnly={isReadOnly} onChange={setCompScores} /></div>
            </div>
          )}
          {section === 'attendance' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">06 · Attendance</span></div>
              <div className="kbt-card-body"><AttendanceSection data={attendance} readOnly={isReadOnly} onChange={setAttendance} /></div>
            </div>
          )}
          {section === 'comment' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">07 · Comment</span></div>
              <div className="kbt-card-body"><CommentSection data={comment} readOnly={isReadOnly} onChange={setComment} /></div>
            </div>
          )}

          {/* 08 Summary */}
          {section === 'summary' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">08 · Score Summary</span></div>
              <div className="kbt-card-body">
                {[
                  { label: 'Goal Setting',  weight: ev.goalWeight,       score: ev.goalScore },
                  { label: 'Competency',    weight: ev.competencyWeight,  score: ev.competencyScore },
                  { label: 'Attendance',    weight: ev.attendanceWeight,  score: ev.attendanceScore },
                ].map(({ label, weight, score }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <p style={{ fontWeight: 500, color: '#94a3b8', fontSize: '0.9375rem' }}>{label}</p>
                      <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 2 }}>Weight: {weight}%</p>
                    </div>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '1.375rem', fontWeight: 700,
                      color: score != null ? '#00c87a' : '#4b5563',
                    }}>
                      {score != null ? score.toFixed(2) : '—'}
                    </span>
                  </div>
                ))}

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, padding: 16,
                  background: 'rgba(0,200,122,0.05)', border: '1px solid rgba(0,200,122,0.15)',
                  borderRadius: 10,
                }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>Total Score</p>
                    {ev.totalScore != null && (
                      <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 4 }}>
                        {ev.totalScore >= 4.5 ? '5 – Role Model' : ev.totalScore >= 3.5 ? '4 – Exceeds Expectation' : ev.totalScore >= 2.5 ? '3 – Meets Expectation' : ev.totalScore >= 1.5 ? '2 – Needs Improvement' : '1 – Unsatisfactory'}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: '2.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                    background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {ev.totalScore != null ? ev.totalScore.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {section === 'salary' && (
            <div className="kbt-card">
              <div className="kbt-card-header"><span className="kbt-card-title">09 · Salary & Bonus</span></div>
              <div className="kbt-card-body">
                {isAdmin || isManager
                  ? <SalarySummarySection data={salary} readOnly={isReadOnly && !isAdmin} onChange={setSalary} />
                  : <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>เฉพาะ Admin / Manager เท่านั้นที่สามารถดูส่วนนี้ได้</div>
                }
              </div>
            </div>
          )}

          {section === 'acknowledge' && (
            <div className="kbt-card">
              <div className="kbt-card-header">
                <span className="kbt-card-title">10 · Acknowledgement</span>
                <CheckSquare size={16} color="#4b5563" />
              </div>
              <div className="kbt-card-body">
                <AcknowledgementSection
                  data={ev.acknowledgement}
                  currentUserId={user?.id ?? ''}
                  evaluateeId={ev.evaluateeId}
                  evaluatorId={ev.evaluatorId}
                  isAdmin={isAdmin}
                  onSign={(t) => ackMutation.mutate(t)}
                  isSigning={ackMutation.isPending}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
