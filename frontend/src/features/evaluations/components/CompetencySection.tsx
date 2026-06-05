import type { CompetencyScore, Position } from '@/types'
import { getCompetenciesForPosition } from '../constants/competency'

interface Props {
  position?: Position
  scores: CompetencyScore[]
  readOnly?: boolean
  onChange: (scores: CompetencyScore[]) => void
}

const SCORE_STYLES: Record<number, { bg: string; color: string; border: string; label: string }> = {
  1: { bg: 'rgba(237,28,36,0.15)',  color: 'var(--kbt-error)',   border: 'rgba(237,28,36,0.3)',  label: 'Unsatisfactory' },
  2: { bg: 'rgba(237,28,36,0.1)',   color: 'var(--amw-red)',     border: 'rgba(237,28,36,0.24)', label: 'Needs Improvement' },
  3: { bg: 'rgba(10,110,209,0.15)', color: 'var(--sap-blue)',    border: 'rgba(10,110,209,0.3)', label: 'Meets Expectation' },
  4: { bg: 'rgba(129,196,255,0.15)', color: 'var(--m-light-blue)', border: 'rgba(129,196,255,0.3)', label: 'Exceeds Expectation' },
  5: { bg: 'rgba(22,88,142,0.18)',  color: 'var(--m-light-blue)', border: 'rgba(129,196,255,0.34)', label: 'Role Model' },
}

export default function CompetencySection({ position, scores, readOnly, onChange }: Props) {
  const competencies = position ? getCompetenciesForPosition(position) : []

  function getScore(id: string) { return scores.find(s => s.competencyId === id)?.score ?? null }
  function setScore(competencyId: string, score: number) {
    const exists = scores.find(s => s.competencyId === competencyId)
    onChange(exists
      ? scores.map(s => s.competencyId === competencyId ? { ...s, score } : s)
      : [...scores, { competencyId, score }]
    )
  }

  if (!position) {
    return (
      <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>
        No position assigned — competency scoring is unavailable.
      </div>
    )
  }

  const validScores = scores.filter(s => s.score != null)
  const avg = validScores.length
    ? (validScores.reduce((s, c) => s + c.score!, 0) / validScores.length).toFixed(2)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {avg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'rgba(10,110,209,0.06)',
          border: '1px solid rgba(129,196,255,0.16)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>Average Score:</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--amw-red)', fontSize: '1rem' }}>{avg}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>/ 5.00</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 8,
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '6px 6px 0 0',
          border: '1px solid var(--kbt-border)',
        }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Competency</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', width: 160 }}>Rating (1–5)</span>
        </div>

        {competencies.map((c, idx) => {
          const current = getScore(c.id)
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 8,
              padding: '12px 14px', alignItems: 'center',
              background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
              border: '1px solid var(--kbt-border)',
              borderTop: 'none',
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--kbt-text-2)' }}>{c.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', lineHeight: 1.5 }}>{c.descriptions[position]}</p>

              <div
                role="radiogroup"
                aria-label={`Rating for ${c.name}`}
                style={{ display: 'flex', gap: 5, width: 160 }}
              >
                {[1, 2, 3, 4, 5].map(v => {
                  const s = SCORE_STYLES[v]
                  const isSelected = current === v
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-label={`${v} — ${s.label}`}
                      aria-checked={isSelected}
                      disabled={readOnly}
                      tabIndex={readOnly ? -1 : (isSelected || (current == null && v === 1)) ? 0 : -1}
                      onClick={() => setScore(c.id, v)}
                      onKeyDown={e => {
                        if (readOnly) return
                        if (e.key === 'ArrowRight' && v < 5) { e.preventDefault(); setScore(c.id, v + 1) }
                        if (e.key === 'ArrowLeft'  && v > 1) { e.preventDefault(); setScore(c.id, v - 1) }
                      }}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: isSelected ? s.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? s.border : 'var(--kbt-border)'}`,
                        color: isSelected ? s.color : 'var(--kbt-text-3)',
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        cursor: readOnly ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                        boxShadow: isSelected ? `0 0 10px ${s.bg}` : 'none',
                      }}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
