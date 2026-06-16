import { CheckCircle2, Clock4 } from 'lucide-react'
import type { EvaluationAcknowledgement } from '@/types'
import { useT } from '@/i18n/languageContext'
import { CalendarPicker } from './CalendarPicker'

interface Props {
  data?: EvaluationAcknowledgement | null
  isAdmin: boolean
  currentUserId?: string
  evaluatorId?: string
  onUpdate: (field: 'employeeSignedAt' | 'evaluatorSignedAt' | 'directorSignedAt', value: string | null) => void
  isUpdating?: boolean
}

function toDateValue(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function toIso(dateValue: string): string | null {
  if (!dateValue) return null
  return new Date(dateValue + 'T00:00:00.000Z').toISOString()
}

export default function AcknowledgementSection({ data, isAdmin, currentUserId, evaluatorId, onUpdate, isUpdating }: Props) {
  const t = useT()

  const parties = [
    {
      label: t('ak.evaluator'),
      sub: t('ak.evaluatorSub'),
      field: 'evaluatorSignedAt' as const,
      signedAt: data?.evaluatorSignedAt,
      canEdit: isAdmin || currentUserId === evaluatorId,
    },
    {
      label: t('ak.director'),
      sub: t('ak.directorSub'),
      field: 'directorSignedAt' as const,
      signedAt: data?.directorSignedAt,
      canEdit: isAdmin,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      {parties.map((party) => (
        <div key={party.field} className="kbt-card" style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            {party.signedAt
              ? <CheckCircle2 size={30} color="var(--m-light-blue)" style={{ margin: '0 auto' }} />
              : <Clock4 size={30} color="var(--kbt-text-3)" style={{ margin: '0 auto' }} />}
          </div>
          <p style={{ color: 'var(--kbt-text)', fontSize: '0.94rem', fontWeight: 900 }}>{party.label}</p>
          <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.75rem', marginTop: 3, marginBottom: 14 }}>{party.sub}</p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {party.signedAt
              ? <span className="kbt-badge-success">{t('ak.acknowledged')}</span>
              : <span className="kbt-badge-neutral">{t('ak.pending')}</span>}

            {party.canEdit ? (
              <CalendarPicker
                value={toDateValue(party.signedAt)}
                onChange={v => onUpdate(party.field, toIso(v))}
                disabled={isUpdating}
                placeholder={t('ak.selectDate')}
              />
            ) : party.signedAt ? (
              <p style={{
                color: 'var(--kbt-text-3)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem',
              }}>
                {party.signedAt.slice(0, 10)}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
