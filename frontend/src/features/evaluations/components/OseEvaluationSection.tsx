import type { CompetencyScore } from '@/types'
import { useLanguage } from '@/i18n/languageContext'
import type { FormDefinition } from '../constants/formDefinitions'

interface Props {
  def: FormDefinition
  scores: CompetencyScore[]
  readOnly?: boolean
  onChange: (scores: CompetencyScore[]) => void
}

const SCORE_STYLE: Record<number, { bg: string; color: string; border: string }> = {
  1: { bg: 'rgba(229,35,33,0.15)',   color: 'var(--kbt-error)',    border: 'rgba(229,35,33,0.3)' },
  2: { bg: 'rgba(229,35,33,0.1)',    color: 'var(--amw-red)',      border: 'rgba(229,35,33,0.24)' },
  3: { bg: 'rgba(92,86,144,0.15)',  color: 'var(--sap-blue)',     border: 'rgba(92,86,144,0.3)' },
  4: { bg: 'rgba(150,144,196,0.15)', color: 'var(--m-light-blue)', border: 'rgba(150,144,196,0.3)' },
  5: { bg: 'rgba(46,42,94,0.18)',   color: 'var(--m-light-blue)', border: 'rgba(150,144,196,0.34)' },
}

export default function OseEvaluationSection({ def, scores, readOnly, onChange }: Props) {
  const { locale } = useLanguage()
  const th = locale === 'th'

  const getScore = (id: string) => scores.find(s => s.competencyId === id)?.score ?? null
  function setScore(competencyId: string, score: number) {
    const exists = scores.find(s => s.competencyId === competencyId)
    onChange(exists
      ? scores.map(s => s.competencyId === competencyId ? { ...s, score } : s)
      : [...scores, { competencyId, score }])
  }

  const allCriteria = def.categories.flatMap(c => c.criteria)
  const rated = allCriteria.map(c => getScore(c.id)).filter((s): s is number => s != null)
  const overallAvg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null
  const overallGrade = overallAvg != null
    ? def.gradeScale.find(g => g.value === Math.round(overallAvg)) ?? def.gradeScale[def.gradeScale.length - 1]
    : null

  const ratingLabel = (score: number) => {
    const r = def.ratingScale.find(x => x.score === score)
    return r ? (th ? r.th : r.en) : String(score)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overall grade banner */}
      {overallGrade && overallAvg != null && (
        <div className="amw-ose-grade">
          <div>
            <span>{th ? 'เกรดรวม' : locale === 'fr' ? 'Note globale' : 'Overall Grade'}</span>
            <strong>{th ? overallGrade.th : locale === 'fr' ? overallGrade.fr : overallGrade.en}</strong>
          </div>
          <span className="kbt-score-value">{overallAvg.toFixed(2)}</span>
        </div>
      )}

      {def.categories.map(cat => {
        const catScores = cat.criteria.map(c => getScore(c.id)).filter((s): s is number => s != null)
        const catTotal = catScores.length
          ? (catScores.reduce((a, b) => a + b, 0) / catScores.length).toFixed(2)
          : '—'
        return (
          <div key={cat.id} className="amw-ose-cat">
            <div className="amw-ose-cat-head">
              <span className="amw-ose-cat-num">{cat.num}</span>
              <div className="amw-ose-cat-title">
                <strong>{th ? cat.titleTh : cat.titleEn}</strong>
                {th && <span>{cat.titleEn}</span>}
              </div>
              <div className="amw-ose-cat-total">
                <span>Total</span>
                <strong>{catTotal}</strong>
              </div>
            </div>

            {cat.criteria.map(crit => {
              const current = getScore(crit.id)
              return (
                <div key={crit.id} className="amw-ose-row">
                  <div className="amw-ose-crit">
                    <span className="amw-ose-crit-id">{crit.id}</span>
                    <div>
                      <p>{th ? crit.th : crit.en}</p>
                      {th && <p className="amw-ose-crit-en">{crit.en}</p>}
                      {(th ? crit.noteTh : crit.noteEn) && (
                        <p className="amw-ose-crit-note">{th ? crit.noteTh : crit.noteEn}</p>
                      )}
                    </div>
                  </div>
                  <div role="radiogroup" aria-label={th ? crit.th : crit.en} className="amw-ose-rating">
                    {[1, 2, 3, 4, 5].map(v => {
                      const s = SCORE_STYLE[v]
                      const selected = current === v
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`${v} — ${ratingLabel(v)}`}
                          title={ratingLabel(v)}
                          disabled={readOnly}
                          onClick={() => setScore(crit.id, v)}
                          style={{
                            background: selected ? s.bg : 'rgba(255,255,255,0.04)',
                            borderColor: selected ? s.border : 'var(--kbt-border)',
                            color: selected ? s.color : 'var(--kbt-text-3)',
                            transform: selected ? 'scale(1.12)' : 'scale(1)',
                            boxShadow: selected ? `0 0 10px ${s.bg}` : 'none',
                            cursor: readOnly ? 'default' : 'pointer',
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
        )
      })}
    </div>
  )
}
