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
  wig: '',
  result: '', evaluationScore: null, employeeComment: '', superiorComment: '', order: 1,
})

const WIG_OPTIONS = [
  { value: 'WIG_1_CUSTOMER', label: 'WIG-1 Customer Focus' },
  { value: 'WIG_2_PEOPLE', label: 'WIG-2 People our Asset' },
  { value: 'WIG_3_RESULT', label: 'WIG-3 Company Result' },
]

// Derive which target rating band the result falls into (for visual mapping only).
// Compares highest → lowest; first match wins. Does NOT auto-fill evaluationScore.
function matchedBand(
  result: string | undefined,
  t5?: string, t4?: string, t3?: string, t2?: string, t1?: string,
): number | null {
  const r = parseFloat((result ?? '').trim())
  if (isNaN(r)) return null
  const pairs: [number, string | undefined][] = [[5, t5], [4, t4], [3, t3], [2, t2], [1, t1]]
  for (const [band, target] of pairs) {
    const t = parseFloat((target ?? '').trim())
    if (!isNaN(t) && r >= t) return band
  }
  return null
}

const SCORE_STYLE: Record<number, { bg: string; color: string; border: string }> = {
  5: { bg: 'rgba(150,144,196,0.18)', color: 'var(--m-light-blue)',  border: 'rgba(150,144,196,0.5)' },
  4: { bg: 'rgba(92,86,144,0.18)',   color: '#9696d0',              border: 'rgba(92,86,144,0.5)' },
  3: { bg: 'rgba(46,200,180,0.14)',  color: '#2ec8b4',              border: 'rgba(46,200,180,0.5)' },
  2: { bg: 'rgba(234,128,0,0.14)',   color: '#ea8000',              border: 'rgba(234,128,0,0.5)' },
  1: { bg: 'rgba(229,35,33,0.14)',   color: 'var(--amw-red)',       border: 'rgba(229,35,33,0.5)' },
}

const SCORE_LABELS = ['', 'Unsatisfactory', 'Needs Improvement', 'Meets Expectation', 'Exceeds Expectation', 'Role Model']

export default function GoalSettingSection({ goals, readOnly, onChange }: Props) {
  const t = useT()

  function update(i: number, field: keyof GoalEntry, value: string | number | null) {
    onChange(goals.map((g, idx) => idx === i ? { ...g, [field]: value } : g))
  }

  const MAX_TOTAL_WEIGHT = 70
  const totalWeight = goals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
  const weightOver = totalWeight > MAX_TOTAL_WEIGHT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
          <span style={{ color: '#6b7a90' }}>
            {t('gs.goals')}: <span style={{ color: '#a8b7cc', fontWeight: 600 }}>{goals.length}/5</span>
          </span>
          <span style={{ color: '#6b7a90' }}>
            {t('gs.totalWeight')}:{' '}
            <span style={{
              fontFamily: 'monospace', fontWeight: 700,
              color: weightOver ? 'var(--amw-red)' : 'var(--m-light-blue)',
            }}>
              {totalWeight}%
            </span>
            <span style={{ color: '#6b7a90', marginLeft: 4 }}>/ {MAX_TOTAL_WEIGHT}%</span>
            {weightOver && (
              <span style={{ marginLeft: 8, color: 'var(--amw-red)', fontWeight: 700 }}>
                เกิน {totalWeight - MAX_TOTAL_WEIGHT}%
              </span>
            )}
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

      {weightOver && (
        <div style={{
          padding: '8px 12px', borderRadius: 6, fontSize: '0.78rem',
          background: 'rgba(229,35,33,0.08)', border: '1px solid rgba(229,35,33,0.25)',
          color: 'var(--amw-red)',
        }}>
          Total weight ({totalWeight}%) เกินกว่า {MAX_TOTAL_WEIGHT}% — ปรับลดน้ำหนักก่อน Submit
        </div>
      )}

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

      {goals.map((goal, idx) => {
        const band = matchedBand(
          String(goal.result ?? ''),
          String(goal.targetRating5 ?? ''), String(goal.targetRating4 ?? ''),
          String(goal.targetRating3 ?? ''), String(goal.targetRating2 ?? ''),
          String(goal.targetRating1 ?? ''),
        )

        return (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Goal card header */}
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
                <button
                  onClick={() => onChange(goals.filter((_, i) => i !== idx).map((g, i) => ({ ...g, order: i + 1 })))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7a90', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e52321')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6b7a90')}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="amw-grid-2" style={{ padding: 14, gap: 12 }}>
              {/* Row 1: Goal name + Weight */}
              <div>
                <label className="kbt-label kbt-label-required">{t('gs.aGoal')}</label>
                <input value={goal.goal} onChange={e => update(idx, 'goal', e.target.value)} disabled={readOnly} className="kbt-input" placeholder={t('gs.phGoal')} />
              </div>
              <div>
                <label className="kbt-label kbt-label-required">{t('gs.cWeight')} (%)</label>
                <input type="number" value={goal.weight} onChange={e => update(idx, 'weight', Number(e.target.value))} disabled={readOnly} min={0} max={100} className="kbt-input" />
              </div>

              {/* Row 2: Description */}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="kbt-label">{t('gs.bDesc')}</label>
                <textarea value={goal.goalDescription ?? ''} rows={2} onChange={e => update(idx, 'goalDescription', e.target.value)} disabled={readOnly} className="kbt-textarea" placeholder={t('gs.phDesc')} />
              </div>

              {/* Row 3: WIG */}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="kbt-label kbt-label-required">WIG Strategic Pillar</label>
                <select value={goal.wig ?? ''} onChange={e => update(idx, 'wig', e.target.value)} disabled={readOnly} className="kbt-select">
                  <option value="">Select WIG</option>
                  {WIG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Row 4: Result — enter first so Target per Rating below can auto-highlight */}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="kbt-label">{t('gs.eResult')}</label>
                <input
                  value={goal.result ?? ''}
                  onChange={e => update(idx, 'result', e.target.value)}
                  disabled={readOnly}
                  className="kbt-input"
                  placeholder={t('gs.phResult')}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  style={{ maxWidth: 260 }}
                />
              </div>

              {/* Row 5: Target per Rating — auto-highlights the band that matches Result above */}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label className="kbt-label" style={{ margin: 0 }}>{t('gs.dTarget')}</label>
                  {band != null ? (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: SCORE_STYLE[band].bg, color: SCORE_STYLE[band].color,
                      border: `1px solid ${SCORE_STYLE[band].border}`,
                    }}>
                      Result → Rating {band}
                    </span>
                  ) : goal.result ? (
                    <span style={{ fontSize: '0.65rem', color: 'var(--kbt-text-3)' }}>
                      กรอก Target เพื่อดู match
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {([5, 4, 3, 2, 1] as const).map((r) => {
                    const s = SCORE_STYLE[r]
                    const isMatch = band === r
                    return (
                      <div key={r}>
                        <div style={{ textAlign: 'center', marginBottom: 4 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 5, fontSize: '0.6875rem', fontWeight: 700,
                            fontFamily: 'monospace',
                            background: isMatch ? s.color : s.bg,
                            color: isMatch ? '#fff' : s.color,
                            boxShadow: isMatch ? `0 0 0 2px ${s.border}` : 'none',
                            transition: 'all 0.2s',
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
                          disabled={readOnly}
                          className="kbt-input"
                          style={{
                            textAlign: 'center', padding: '0 4px',
                            borderColor: isMatch ? s.border : undefined,
                            background: isMatch ? s.bg : undefined,
                            transition: 'all 0.2s',
                          }}
                          placeholder="—"
                        />
                        {isMatch && (
                          <div style={{ textAlign: 'center', marginTop: 4, fontSize: '0.6rem', color: s.color, fontWeight: 700 }}>
                            ▲ matched
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Row 6: Evaluation Score — manual select after seeing the matched band */}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="kbt-label kbt-label-required">{t('gs.fScore')}</label>
                <select
                  value={goal.evaluationScore ?? ''}
                  onChange={e => update(idx, 'evaluationScore', e.target.value ? Number(e.target.value) : null)}
                  disabled={readOnly}
                  className="kbt-select"
                  style={{
                    maxWidth: 320,
                    ...(goal.evaluationScore != null ? {
                      background: SCORE_STYLE[goal.evaluationScore]?.bg,
                      borderColor: SCORE_STYLE[goal.evaluationScore]?.border,
                      color: SCORE_STYLE[goal.evaluationScore]?.color,
                      fontWeight: 700,
                    } : {}),
                  }}
                >
                  <option value="">{t('gs.select')}</option>
                  {[5, 4, 3, 2, 1].map(s => (
                    <option key={s} value={s}>{s} – {SCORE_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Row 6: Comments */}
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
        )
      })}
    </div>
  )
}
