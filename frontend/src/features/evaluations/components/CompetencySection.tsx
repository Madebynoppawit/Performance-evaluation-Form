import type { CompetencyScore, Position } from '@/types'
import { getCompetenciesForPosition } from '../constants/competency'

interface Props {
  position?: Position
  scores: CompetencyScore[]
  readOnly?: boolean
  onChange: (scores: CompetencyScore[]) => void
}

const SCORE_STYLES: Record<number, { bg: string; color: string; border: string }> = {
  1: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  border: 'rgba(239,68,68,0.3)' },
  2: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b',  border: 'rgba(245,158,11,0.3)' },
  3: { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6',  border: 'rgba(59,130,246,0.3)' },
  4: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e',  border: 'rgba(34,197,94,0.3)' },
  5: { bg: 'rgba(0,200,122,0.15)',   color: '#00c87a',  border: 'rgba(0,200,122,0.3)' },
}

export default function CompetencySection({ position, scores, readOnly, onChange }: Props) {
  const competencies = position ? getCompetenciesForPosition(position) : []

  function getScore(id: string) { return scores.find(s => s.competencyId === id)?.score ?? null }
  function setScore(competencyId: string, score: number) {
    const exists = scores.find(s => s.competencyId === competencyId)
    onChange(exists ? scores.map(s => s.competencyId === competencyId ? { ...s, score } : s) : [...scores, { competencyId, score }])
  }

  if (!position) return <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>ไม่ระบุตำแหน่ง — ไม่สามารถแสดง Competency ได้</div>

  const validScores = scores.filter(s => s.score != null)
  const avg = validScores.length ? (validScores.reduce((s, c) => s + c.score!, 0) / validScores.length).toFixed(2) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {avg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.15)', borderRadius: 8 }}>
          <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>Average Score:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a', fontSize: '1rem' }}>{avg}</span>
          <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>/ 5.00</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 8, padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px 6px 0 0', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Competency</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description (for this position)</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', width: 160 }}>Rating (1–5)</span>
        </div>

        {competencies.map((c, idx) => {
          const current = getScore(c.id)
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 8,
              padding: '12px 14px', alignItems: 'center',
              background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              borderTop: 'none',
            }}>
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>{c.name}</p>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.5 }}>{c.descriptions[position]}</p>
              <div style={{ display: 'flex', gap: 5, width: 160 }}>
                {[1, 2, 3, 4, 5].map(v => {
                  const s = SCORE_STYLES[v]
                  const isSelected = current === v
                  return (
                    <button key={v} type="button" disabled={readOnly} onClick={() => setScore(c.id, v)} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: isSelected ? s.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? s.border : 'rgba(255,255,255,0.08)'}`,
                      color: isSelected ? s.color : '#4b5563',
                      fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                      cursor: readOnly ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected ? `0 0 10px ${s.bg}` : 'none',
                    }}>
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
