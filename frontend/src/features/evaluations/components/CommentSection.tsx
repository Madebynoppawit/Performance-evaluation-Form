import type { EvaluationComment } from '@/types'

interface Props {
  data: EvaluationComment
  readOnly?: boolean
  onChange: (data: EvaluationComment) => void
}

const FIELDS = [
  { key: 'strengths'     as const, label: 'a. Strengths (จุดแข็ง)',                        placeholder: 'ระบุจุดแข็งของพนักงาน...', color: '#00c87a' },
  { key: 'improvements'  as const, label: 'b. Areas for Improvement (จุดที่ต้องพัฒนา)',      placeholder: 'ระบุจุดที่ต้องพัฒนา...', color: '#f59e0b' },
  { key: 'requiredSkills'as const, label: 'c. Required Skills (ความรู้/ทักษะที่จำเป็น)',      placeholder: 'ระบุความรู้หรือทักษะที่ต้องการ...', color: '#3b82f6' },
]

export default function CommentSection({ data, readOnly, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FIELDS.map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
            <span style={{ color, marginRight: 4 }}>◆</span>{label}
          </label>
          <textarea
            value={data[key] ?? ''}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            disabled={readOnly}
            rows={4}
            className="kbt-textarea"
            style={{ borderLeft: `2px solid ${color}20` }}
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  )
}
