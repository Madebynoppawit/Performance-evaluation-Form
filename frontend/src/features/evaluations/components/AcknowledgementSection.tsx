import { CheckCircle2, Clock4, Loader2 } from 'lucide-react'
import type { EvaluationAcknowledgement } from '@/types'
import { formatDate } from '@/lib/utils'
import { useT } from '@/i18n/languageContext'

interface Props {
  data?: EvaluationAcknowledgement | null
  currentUserId: string
  evaluateeId: string
  evaluatorId: string
  isAdmin: boolean
  onSign: (type: 'employee' | 'evaluator' | 'director') => void
  isSigning?: boolean
}

export default function AcknowledgementSection({ data, currentUserId, evaluateeId, evaluatorId, isAdmin, onSign, isSigning }: Props) {
  const t = useT()
  const signers = [
    { label: t('ak.employee'), sub: t('ak.employeeSub'), signedAt: data?.employeeSignedAt, canSign: currentUserId === evaluateeId && !data?.employeeSignedAt, type: 'employee' as const },
    { label: t('ak.evaluator'), sub: t('ak.evaluatorSub'), signedAt: data?.evaluatorSignedAt, canSign: currentUserId === evaluatorId && !data?.evaluatorSignedAt, type: 'evaluator' as const },
    { label: t('ak.director'), sub: t('ak.directorSub'), signedAt: data?.directorSignedAt, canSign: isAdmin && !data?.directorSignedAt, type: 'director' as const },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
      {signers.map((signer) => (
        <div key={signer.type} className="kbt-card" style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            {signer.signedAt
              ? <CheckCircle2 size={30} color="var(--m-light-blue)" style={{ margin: '0 auto' }} />
              : <Clock4 size={30} color="var(--kbt-text-3)" style={{ margin: '0 auto' }} />}
          </div>
          <p style={{ color: 'var(--kbt-text)', fontSize: '0.94rem', fontWeight: 900 }}>{signer.label}</p>
          <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem', marginTop: 3, marginBottom: 14 }}>{signer.sub}</p>

          {signer.signedAt ? (
            <div>
              <span className="kbt-badge-success">{t('ak.acknowledged')}</span>
              <p style={{ color: 'var(--kbt-text-3)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', marginTop: 8 }}>
                {formatDate(signer.signedAt)}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span className="kbt-badge-neutral">{t('ak.pending')}</span>
              {signer.canSign && (
                <button onClick={() => onSign(signer.type)} disabled={isSigning} className="kbt-btn-primary" style={{ height: 30, padding: '0 14px', fontSize: '0.75rem' }}>
                  {isSigning ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {t('ak.acknowledge')}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
