import type { CompetencyScore, Position } from '@/types'
import { getCompetenciesForPosition, competencyPosition } from '../constants/competency'
import { useT } from '@/i18n/languageContext'

interface Props {
  position?: Position
  scores: CompetencyScore[]
  readOnly?: boolean
  onChange: (scores: CompetencyScore[]) => void
}

const SCORE_STYLES: Record<number, { bg: string; color: string; border: string; label: string }> = {
  1: { bg: 'rgba(229,35,33,0.15)',  color: 'var(--kbt-error)',   border: 'rgba(229,35,33,0.3)',  label: 'Unsatisfactory' },
  2: { bg: 'rgba(229,35,33,0.1)',   color: 'var(--amw-red)',     border: 'rgba(229,35,33,0.24)', label: 'Needs Improvement' },
  3: { bg: 'rgba(92,86,144,0.15)', color: 'var(--sap-blue)',    border: 'rgba(92,86,144,0.3)', label: 'Meets Expectation' },
  4: { bg: 'rgba(150,144,196,0.15)', color: 'var(--m-light-blue)', border: 'rgba(150,144,196,0.3)', label: 'Exceeds Expectation' },
  5: { bg: 'rgba(46,42,94,0.18)',  color: 'var(--m-light-blue)', border: 'rgba(150,144,196,0.34)', label: 'Role Model' },
}

export default function CompetencySection({ position, scores, readOnly, onChange }: Props) {
  const t = useT()
  const competencies = position ? getCompetenciesForPosition(position) : []

  function getScore(id: string) { return scores.find(s => s.competencyId === id)?.score ?? null }
  function setScore(competencyId: string, score: number) {
    const exists = scores.find(s => s.competencyId === competencyId)
    onChange(exists
      ? scores.map(s => s.competencyId === competencyId ? { ...s, score } : s)
      : [...scores, { competencyId, score }]
    )
  }
  function getSelfScore(id: string) { return scores.find(s => s.competencyId === id)?.selfScore ?? null }
  function setSelfScore(competencyId: string, selfScore: number) {
    const exists = scores.find(s => s.competencyId === competencyId)
    onChange(exists
      ? scores.map(s => s.competencyId === competencyId ? { ...s, selfScore } : s)
      : [...scores, { competencyId, selfScore }]
    )
  }

  // One labelled 1–5 selector (used twice per row: Manager + Self).
  function ratingRow(cName: string, current: number | null, onPick: (v: number) => void, label: string) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 52, fontSize: '0.5625rem', fontWeight: 800, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div role="radiogroup" aria-label={`${label} rating for ${cName}`} style={{ display: 'flex', gap: 5 }}>
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
                onClick={() => onPick(v)}
                onKeyDown={e => {
                  if (readOnly) return
                  if (e.key === 'ArrowRight' && v < 5) { e.preventDefault(); onPick(v + 1) }
                  if (e.key === 'ArrowLeft' && v > 1) { e.preventDefault(); onPick(v - 1) }
                }}
                style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: isSelected ? s.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? s.border : 'var(--kbt-border)'}`,
                  color: isSelected ? s.color : 'var(--kbt-text-3)',
                  fontSize: '0.7rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
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
  }

  if (!position) {
    return (
      <div className="kbt-msg-info" style={{ fontSize: '0.8125rem' }}>
        {t('cs.noPosition')}
      </div>
    )
  }

  const validScores = scores.filter(s => s.score != null)
  const avg = validScores.length
    ? (validScores.reduce((s, c) => s + c.score!, 0) / validScores.length).toFixed(2)
    : null
  const groups = [
    { title: 'Core Competency', items: competencies.filter(c => c.id.startsWith('CC')) },
    { title: 'Management Competency', items: competencies.filter(c => c.id.startsWith('MC')) },
    { title: 'Technical Competency', items: competencies.filter(c => c.id.startsWith('TC')) },
  ].filter(group => group.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {avg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'rgba(92,86,144,0.06)',
          border: '1px solid rgba(150,144,196,0.16)',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>{t('cs.avgScore')}</span>
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
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('cs.competency')}</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('cs.description')}</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', width: 200 }}>{t('cs.rating')}</span>
        </div>

        {groups.map((group) => (
          <div key={group.title} style={{ border: '1px solid var(--kbt-border)', borderTop: 'none' }}>
            <div style={{ padding: '9px 14px', background: 'rgba(92,86,144,0.06)', color: 'var(--kbt-text)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.02em' }}>
              {group.title}
            </div>
            {group.items.map((c, idx) => {
          const current = getScore(c.id)
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 8,
              padding: '12px 14px', alignItems: 'center',
              background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
              borderTop: '1px solid var(--kbt-border)',
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--kbt-text-2)' }}>{c.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', lineHeight: 1.5 }}>{c.descriptions[competencyPosition(position)]}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 200 }}>
                {ratingRow(c.name, current, v => setScore(c.id, v), t('cs.mgr'))}
                {ratingRow(c.name, getSelfScore(c.id), v => setSelfScore(c.id, v), t('cs.self'))}
              </div>
            </div>
          )
        })}
          </div>
        ))}
      </div>
    </div>
  )
}
