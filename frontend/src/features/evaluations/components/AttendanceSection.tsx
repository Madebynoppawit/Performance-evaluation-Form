import type { AttendanceScore } from '@/types'
import { DISCIPLINARY_OPTIONS } from '../constants/competency'

interface Props {
  data: AttendanceScore
  readOnly?: boolean
  onChange: (data: AttendanceScore) => void
}

const SCORE_COLOR = (s: number) =>
  s >= 4 ? '#00c87a' : s === 3 ? '#3b82f6' : s === 2 ? '#f59e0b' : '#ef4444'

export default function AttendanceSection({ data, readOnly, onChange }: Props) {
  function update<K extends keyof AttendanceScore>(field: K, value: AttendanceScore[K]) {
    onChange({ ...data, [field]: value })
  }

  const scores = [data.leaveScore, data.lateScore, data.disciplinaryScore].filter(s => s != null) as number[]
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null

  const CRITERIA = [
    { label: 'Leave (Sick/Casual/Absent)', scores: { 5: '0 days', 4: '1-2 days', 3: '3-4 days', 2: '5-6 days', 1: '>7 days' } },
    { label: 'Late',                       scores: { 5: '≤6×',    4: '≤8×',      3: '≤10×',     2: '≤12×',     1: '>14×'  } },
    { label: 'Disciplinary',               scores: { 5: 'None',   4: 'None',     3: 'None',     2: 'Warning×1', 1: '>2 or Suspend' } },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {avg && (
        <div style={{ padding: '8px 14px', background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.15)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>Attendance Average:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a' }}>{avg}</span>
          <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>/ 5.00</span>
        </div>
      )}

      {/* Reference table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Criteria</th>
              {[5, 4, 3, 2, 1].map(s => (
                <th key={s} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 5, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem',
                    background: s >= 4 ? 'rgba(0,200,122,0.15)' : s === 3 ? 'rgba(59,130,246,0.15)' : s === 2 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: SCORE_COLOR(s),
                  }}>{s}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((row, i) => (
              <tr key={row.label} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: '#94a3b8' }}>{row.label}</td>
                {([5, 4, 3, 2, 1] as const).map(s => (
                  <td key={s} style={{ padding: '8px 12px', textAlign: 'center', color: '#4b5563' }}>{row.scores[s]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label className="kbt-label">Leave Actual Days</label>
          <input type="number" min={0} value={data.leaveActualDays ?? ''} onChange={e => update('leaveActualDays', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0" />
          {data.leaveScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.leaveScore), fontFamily: 'monospace', fontWeight: 600 }}>
              → Score: {data.leaveScore}
            </p>
          )}
        </div>
        <div>
          <label className="kbt-label">Late Actual Times</label>
          <input type="number" min={0} value={data.lateActualTimes ?? ''} onChange={e => update('lateActualTimes', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0" />
          {data.lateScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.lateScore), fontFamily: 'monospace', fontWeight: 600 }}>
              → Score: {data.lateScore}
            </p>
          )}
        </div>
        <div>
          <label className="kbt-label">Disciplinary Level</label>
          <select value={data.disciplinaryLevel ?? 'NONE'} onChange={e => update('disciplinaryLevel', e.target.value as AttendanceScore['disciplinaryLevel'])} disabled={readOnly} className="kbt-select">
            {DISCIPLINARY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {data.disciplinaryScore != null && (
            <p style={{ fontSize: '0.75rem', marginTop: 5, color: SCORE_COLOR(data.disciplinaryScore), fontFamily: 'monospace', fontWeight: 600 }}>
              → Score: {data.disciplinaryScore}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
