import type { EvaluationAcknowledgement } from '@/types'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, Clock4, Loader2 } from 'lucide-react'

interface Props {
  data?: EvaluationAcknowledgement | null
  currentUserId: string
  evaluateeId: string
  evaluatorId: string
  isAdmin: boolean
  onSign: (t: 'employee' | 'evaluator' | 'director') => void
  isSigning?: boolean
}

export default function AcknowledgementSection({ data, currentUserId, evaluateeId, evaluatorId, isAdmin, onSign, isSigning }: Props) {
  const signers = [
    { label: 'Employee',        sub: 'พนักงาน',           signedAt: data?.employeeSignedAt,  canSign: currentUserId === evaluateeId && !data?.employeeSignedAt,  type: 'employee'  as const },
    { label: 'Evaluator',       sub: 'ผู้ประเมิน / หัวหน้า', signedAt: data?.evaluatorSignedAt, canSign: currentUserId === evaluatorId && !data?.evaluatorSignedAt, type: 'evaluator' as const },
    { label: 'Director / MD',   sub: 'Director หรือ MD',  signedAt: data?.directorSignedAt,  canSign: isAdmin && !data?.directorSignedAt,                         type: 'director'  as const },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {signers.map((s) => (
        <div key={s.type} style={{
          background: s.signedAt ? 'rgba(0,200,122,0.05)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${s.signedAt ? 'rgba(0,200,122,0.2)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 10, padding: 20, textAlign: 'center',
          transition: 'all 0.2s',
        }}>
          {/* Icon */}
          <div style={{ marginBottom: 12 }}>
            {s.signedAt
              ? <CheckCircle2 size={32} color="#00c87a" style={{ margin: '0 auto' }} />
              : <Clock4 size={32} color="#4b5563" style={{ margin: '0 auto' }} />}
          </div>

          {/* Labels */}
          <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9375rem', marginBottom: 2 }}>{s.label}</p>
          <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: 14 }}>{s.sub}</p>

          {/* Status */}
          {s.signedAt ? (
            <div>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(0,200,122,0.12)', color: '#00c87a',
                border: '1px solid rgba(0,200,122,0.2)',
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Acknowledged
              </span>
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 8, fontFamily: 'monospace' }}>
                {formatDate(s.signedAt)}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.05)', color: '#4b5563',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Pending
              </span>
              {s.canSign && (
                <button onClick={() => onSign(s.type)} disabled={isSigning} className="kbt-btn-primary" style={{ height: 30, padding: '0 14px', fontSize: '0.75rem' }}>
                  {isSigning ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Acknowledge
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
