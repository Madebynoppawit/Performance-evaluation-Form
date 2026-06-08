import type { AttendanceScore } from '@/types'
import { DISCIPLINARY_OPTIONS } from '../constants/competency'
import { useT } from '@/i18n/languageContext'
import type { TranslationKey } from '@/i18n/translations'

interface Props {
  data: AttendanceScore
  readOnly?: boolean
  onChange: (data: AttendanceScore) => void
}

const SCORE_COLOR = (score: number) =>
  score >= 4 ? 'var(--m-light-blue)' : score === 3 ? 'var(--sap-blue)' : 'var(--amw-red)'

const SCORE_BG = (score: number) =>
  score >= 4 ? 'rgba(129,196,255,0.15)' : score === 3 ? 'rgba(10,110,209,0.15)' : 'rgba(237,28,36,0.12)'

const CRITERIA: { labelKey: TranslationKey; scores: Record<number, string> }[] = [
  { labelKey: 'att.leave', scores: { 5: '0 days', 4: '1-2 days', 3: '3-4 days', 2: '5-6 days', 1: '>7 days' } },
  { labelKey: 'att.late', scores: { 5: '<=6 times', 4: '<=8 times', 3: '<=10 times', 2: '<=12 times', 1: '>14 times' } },
  { labelKey: 'att.disciplinary', scores: { 5: 'None', 4: 'None', 3: 'None', 2: 'Warning x1', 1: '>2 or Suspend' } },
]

export default function AttendanceSection({ data, readOnly, onChange }: Props) {
  const t = useT()
  function update<K extends keyof AttendanceScore>(field: K, value: AttendanceScore[K]) {
    onChange({ ...data, [field]: value })
  }

  const scores = [data.leaveScore, data.lateScore, data.disciplinaryScore].filter(s => s != null) as number[]
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {avg && (
        <div style={{ padding: '8px 14px', background: 'rgba(10,110,209,0.06)', border: '1px solid rgba(129,196,255,0.15)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7a90' }}>{t('att.average')}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--amw-red)' }}>{avg}</span>
          <span style={{ fontSize: '0.75rem', color: '#6b7a90' }}>/ 5.00</span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7a90', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{t('att.criteria')}</th>
              {[5, 4, 3, 2, 1].map(score => (
                <th key={score} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 5, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem',
                    background: SCORE_BG(score),
                    color: SCORE_COLOR(score),
                  }}>
                    {score}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((row, i) => (
              <tr key={row.labelKey} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: '#a8b7cc' }}>{t(row.labelKey)}</td>
                {([5, 4, 3, 2, 1] as const).map(score => (
                  <td key={score} style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7a90' }}>{row.scores[score]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label className="kbt-label">{t('att.leaveActual')}</label>
          <input type="number" min={0} value={data.leaveActualDays ?? ''} onChange={e => update('leaveActualDays', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0" />
          {data.leaveScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.leaveScore), fontFamily: 'monospace', fontWeight: 600 }}>
              {t('att.score')}: {data.leaveScore}
            </p>
          )}
        </div>
        <div>
          <label className="kbt-label">{t('att.lateActual')}</label>
          <input type="number" min={0} value={data.lateActualTimes ?? ''} onChange={e => update('lateActualTimes', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0" />
          {data.lateScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.lateScore), fontFamily: 'monospace', fontWeight: 600 }}>
              {t('att.score')}: {data.lateScore}
            </p>
          )}
        </div>
        <div>
          <label className="kbt-label">{t('att.discLevel')}</label>
          <select value={data.disciplinaryLevel ?? 'NONE'} onChange={e => update('disciplinaryLevel', e.target.value as AttendanceScore['disciplinaryLevel'])} disabled={readOnly} className="kbt-select">
            {DISCIPLINARY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {data.disciplinaryScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.disciplinaryScore), fontFamily: 'monospace', fontWeight: 600 }}>
              {t('att.score')}: {data.disciplinaryScore}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
