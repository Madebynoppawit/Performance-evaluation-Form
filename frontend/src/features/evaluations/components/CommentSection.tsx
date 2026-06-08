import type { EvaluationComment } from '@/types'
import { useT } from '@/i18n/languageContext'
import type { TranslationKey } from '@/i18n/translations'

interface Props {
  data: EvaluationComment
  readOnly?: boolean
  onChange: (data: EvaluationComment) => void
}

const FIELDS: { key: 'strengths' | 'improvements' | 'requiredSkills'; labelKey: TranslationKey; phKey: TranslationKey }[] = [
  { key: 'strengths', labelKey: 'cm.aStrengths', phKey: 'cm.phStrengths' },
  { key: 'improvements', labelKey: 'cm.bImprove', phKey: 'cm.phImprove' },
  { key: 'requiredSkills', labelKey: 'cm.cSkills', phKey: 'cm.phSkills' },
]

export default function CommentSection({ data, readOnly, onChange }: Props) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FIELDS.map(({ key, labelKey, phKey }) => (
        <div key={key}>
          <label className="kbt-label">{t(labelKey)}</label>
          <textarea
            value={data[key] ?? ''}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            disabled={readOnly}
            rows={4}
            className="kbt-textarea"
            placeholder={t(phKey)}
          />
        </div>
      ))}
    </div>
  )
}
