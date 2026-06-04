import type { EvaluationComment } from '@/types'

interface Props {
  data: EvaluationComment
  readOnly?: boolean
  onChange: (data: EvaluationComment) => void
}

const FIELDS = [
  { key: 'strengths' as const, label: 'a. Strengths', placeholder: 'Summarize strengths, standout behaviors, and delivered impact.' },
  { key: 'improvements' as const, label: 'b. Areas for Improvement', placeholder: 'Describe opportunities, risks, and improvement focus areas.' },
  { key: 'requiredSkills' as const, label: 'c. Required Skills', placeholder: 'List skills, knowledge, or support needed for the next cycle.' },
]

export default function CommentSection({ data, readOnly, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="kbt-label">{label}</label>
          <textarea
            value={data[key] ?? ''}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            disabled={readOnly}
            rows={4}
            className="kbt-textarea"
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  )
}
