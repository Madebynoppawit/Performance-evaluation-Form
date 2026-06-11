import type { Position, TrainingScore } from '@/types'

interface Props {
  data: TrainingScore
  position?: Position
  readOnly?: boolean
  onChange: (data: TrainingScore) => void
}

function defaultMinimumHours(position?: Position) {
  if (position === 'DIRECTOR_UP' || position === 'MANAGER') return 12
  if (position === 'OFFICER' || position === 'SUPERVISOR') return 10
  if (position === 'PRODUCTION_STAFF') return 8
  return 0
}

function calculate(actual?: number | null, minimum?: number | null) {
  if (actual == null || minimum == null || minimum <= 0) return { percent: null, score: null }
  const percent = (actual / minimum) * 100
  const score = percent >= 130 ? 5 : percent >= 110 ? 4 : percent >= 100 ? 3 : percent >= 70 ? 2 : 1
  return { percent, score }
}

export default function TrainingSection({ data, position, readOnly, onChange }: Props) {
  const minimumHours = data.minimumHours ?? defaultMinimumHours(position)
  const { percent, score } = calculate(data.actualHours, minimumHours)

  function update<K extends keyof TrainingScore>(field: K, value: TrainingScore[K]) {
    const next = { ...data, [field]: value }
    const nextMinimum = field === 'minimumHours' ? value as number | null : (next.minimumHours ?? defaultMinimumHours(position))
    const calculated = calculate(next.actualHours, nextMinimum)
    onChange({
      ...next,
      minimumHours: nextMinimum,
      percentOfMinimum: calculated.percent,
      score: calculated.score,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: 14, border: '1px solid var(--kbt-border)', borderRadius: 8, background: 'rgba(92,86,144,0.05)' }}>
        <strong style={{ color: 'var(--kbt-text)' }}>Training score bands</strong>
        <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.78rem', marginTop: 5 }}>
          5: &gt;=130% · 4: 110-129% · 3: 100-109% · 2: 70-99% · 1: &lt;70% of minimum hours
        </p>
      </div>

      <div className="amw-grid-2" style={{ gap: 14 }}>
        <div>
          <label className="kbt-label kbt-label-required">Minimum training hours / year</label>
          <input type="number" min={0} step="0.5" value={minimumHours || ''} onChange={e => update('minimumHours', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" />
        </div>
        <div>
          <label className="kbt-label kbt-label-required">Actual training hours</label>
          <input type="number" min={0} step="0.5" value={data.actualHours ?? ''} onChange={e => update('actualHours', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" />
        </div>
      </div>

      <div className="amw-grid-2" style={{ gap: 14 }}>
        <div>
          <p className="kbt-fact-label">% vs minimum</p>
          <p className="kbt-fact-value">{percent == null ? '-' : `${percent.toFixed(1)}%`}</p>
        </div>
        <div>
          <p className="kbt-fact-label">Training score</p>
          <p className="kbt-fact-value">{score ?? '-'}</p>
        </div>
      </div>

      <div>
        <label className="kbt-label">Behavior expectation / Apply / Share note</label>
        <textarea value={data.behaviorNote ?? ''} rows={3} onChange={e => update('behaviorNote', e.target.value)} disabled={readOnly} className="kbt-textarea" placeholder="How the employee applied or shared learning." />
      </div>
    </div>
  )
}
