import { Plus, Trash2 } from 'lucide-react'
import type { GoalEntry } from '@/types'
import { useT } from '@/i18n/languageContext'

interface Props {
  goals: GoalEntry[]
  readOnly?: boolean
  onChange: (goals: GoalEntry[]) => void
}

const emptyGoal = (): GoalEntry => ({
  goal: '', goalDescription: '', weight: 20,
  targetRating5: '', targetRating4: '', targetRating3: '', targetRating2: '', targetRating1: '',
  wig: '', kpiCategory: '',
  result: '', evaluationScore: null, employeeComment: '', superiorComment: '', order: 1,
})

const WIG_OPTIONS = [
  { value: 'WIG_1_CUSTOMER', label: 'WIG-1 Customer Focus' },
  { value: 'WIG_2_PEOPLE', label: 'WIG-2 People our Asset' },
  { value: 'WIG_3_RESULT', label: 'WIG-3 Company Result' },
]

export default function GoalSettingSection({ goals, readOnly, onChange }: Props) {
  const t = useT()
  function update(i: number, field: keyof GoalEntry, value: string | number | null) {
    onChange(goals.map((g, idx) => idx === i ? { ...g, [field]: value } : g))
  }

  const totalWeight = goals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
  const weightOk = totalWeight === 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
          <span style={{ color: '#6b7a90' }}>{t('gs.goals')}: <span style={{ color: '#a8b7cc', fontWeight: 600 }}>{goals.length}/5</span></span>
          <span style={{ color: '#6b7a90' }}>
            {t('gs.totalWeight')}:{' '}
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: weightOk ? 'var(--m-light-blue)' : 'var(--amw-red)' }}>
              {totalWeight}%
            </span>
            {!weightOk && goals.length > 0 && <span style={{ color: 'var(--amw-red)' }}> {t('gs.shouldBe100')}</span>}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {!readOnly && goals.length < 5 && (
          <button
            onClick={() => onChange([...goals, { ...emptyGoal(), order: goals.length + 1 }])}
            className="kbt-btn-outline"
            style={{ height: 30, padding: '0 12px', fontSize: '0.75rem', gap: 5 }}
          >
            <Plus size={12} /> {t('gs.addGoal')}
          </button>
        )}
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8,
          color: '#6b7a90', fontSize: '0.875rem',
        }}>
          <Plus size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          {t('gs.empty')}
        </div>
      )}

      {/* Goal cards */}
      {goals.map((goal, idx) => (
        <div key={idx} style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          {/* Goal header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(92,86,144,0.04)',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              background: 'rgba(92,86,144,0.14)', border: '1px solid rgba(150,144,196,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.625rem', fontWeight: 700, color: 'var(--m-light-blue)', fontFamily: 'monospace',
            }}>
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: goal.goal ? '#a8b7cc' : '#6b7a90', flex: 1 }}>
              {goal.goal || `${t('gs.goal')} ${idx + 1}`}
            </span>
            {!readOnly && (
              <button onClick={() => onChange(goals.filter((_, i) => i !== idx).map((g, i) => ({ ...g, order: i + 1 })))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7a90', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e52321')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7a90')}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="amw-grid-2" style={{ padding: 14, gap: 12 }}>
            <div>
              <label className="kbt-label kbt-label-required">{t('gs.aGoal')}</label>
              <input value={goal.goal} onChange={e => update(idx, 'goal', e.target.value)} disabled={readOnly} className="kbt-input" placeholder={t('gs.phGoal')} />
            </div>
            <div>
              <label className="kbt-label kbt-label-required">{t('gs.cWeight')}</label>
              <input type="number" value={goal.weight} onChange={e => update(idx, 'weight', Number(e.target.value))} disabled={readOnly} min={0} max={100} className="kbt-input" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="kbt-label">{t('gs.bDesc')}</label>
              <textarea value={goal.goalDescription ?? ''} rows={2} onChange={e => update(idx, 'goalDescription', e.target.value)} disabled={readOnly} className="kbt-textarea" placeholder={t('gs.phDesc')} />
            </div>

            <div>
              <label className="kbt-label kbt-label-required">WIG Strategic Pillar</label>
              <select value={goal.wig ?? ''} onChange={e => update(idx, 'wig', e.target.value)} disabled={readOnly} className="kbt-select">
                <option value="">Select WIG</option>
                {WIG_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="kbt-label kbt-label-required">KPI Category</label>
              <input value={goal.kpiCategory ?? ''} onChange={e => update(idx, 'kpiCategory', e.target.value)} disabled={readOnly} className="kbt-input" placeholder="Customer / People / Business performance" />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label className="kbt-label">{t('gs.dTarget')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {([5, 4, 3, 2, 1] as const).map((r) => (
                  <div key={r}>
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 5, fontSize: '0.6875rem', fontWeight: 700,
                        fontFamily: 'monospace',
                        background: r >= 4 ? 'rgba(150,144,196,0.14)' : r === 3 ? 'rgba(92,86,144,0.12)' : 'rgba(229,35,33,0.1)',
                        color: r >= 4 ? 'var(--m-light-blue)' : r === 3 ? 'var(--sap-blue)' : 'var(--amw-red)',
                      }}>
                        {r}
                      </span>
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={(goal[`targetRating${r}` as keyof GoalEntry] as string) ?? ''}
                      onChange={e => update(idx, `targetRating${r}` as keyof GoalEntry, e.target.value)}
                      disabled={readOnly} className="kbt-input" style={{ textAlign: 'center', padding: '0 4px' }} placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="kbt-label">{t('gs.eResult')}</label>
              <input value={goal.result ?? ''} onChange={e => update(idx, 'result', e.target.value)} disabled={readOnly} className="kbt-input" placeholder={t('gs.phResult')} />
            </div>
            <div>
              <label className="kbt-label">{t('gs.fScore')}</label>
              <select value={goal.evaluationScore ?? ''} onChange={e => update(idx, 'evaluationScore', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-select">
                <option value="">{t('gs.select')}</option>
                {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="kbt-label">{t('gs.gEmp')}</label>
              <textarea value={goal.employeeComment ?? ''} rows={2} onChange={e => update(idx, 'employeeComment', e.target.value)} disabled={readOnly} className="kbt-textarea" />
            </div>
            <div>
              <label className="kbt-label">{t('gs.hSup')}</label>
              <textarea value={goal.superiorComment ?? ''} rows={2} onChange={e => update(idx, 'superiorComment', e.target.value)} disabled={readOnly} className="kbt-textarea" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
