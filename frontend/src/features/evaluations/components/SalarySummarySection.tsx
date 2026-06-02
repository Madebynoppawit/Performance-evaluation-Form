import type { SalarySummary } from '@/types'

interface Props { data: SalarySummary; readOnly?: boolean; onChange: (d: SalarySummary) => void }

export default function SalarySummarySection({ data, readOnly, onChange }: Props) {
  function update<K extends keyof SalarySummary>(field: K, value: SalarySummary[K]) { onChange({ ...data, [field]: value }) }

  const diff = data.newSalary && data.oldSalary ? data.newSalary - data.oldSalary : null
  const pct  = diff && data.oldSalary ? ((diff / data.oldSalary) * 100).toFixed(2) : null
  const fmt  = (v?: number | null) => v != null ? v.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label className="kbt-label">เงินเดือนเก่า (Old Salary)</label>
          <input type="number" value={data.oldSalary ?? ''} onChange={e => update('oldSalary', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">เงินเดือนใหม่ (New Salary)</label>
          <input type="number" value={data.newSalary ?? ''} onChange={e => update('newSalary', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
      </div>

      {diff != null && (
        <div style={{ padding: '12px 16px', background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.15)', borderRadius: 8, display: 'flex', gap: 24 }}>
          <div>
            <p style={{ fontSize: '0.625rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Increase</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a', fontSize: '1.125rem' }}>฿{fmt(diff)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.625rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Percentage</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a', fontSize: '1.125rem' }}>{pct}%</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label className="kbt-label">โบนัส (Bonus)</label>
          <input type="number" value={data.bonus ?? ''} onChange={e => update('bonus', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">หักโบนัส (Deduction)</label>
          <input type="number" value={data.bonusDeduction ?? ''} onChange={e => update('bonusDeduction', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">อ้างอิง Policy</label>
          <input value={data.bonusPolicy ?? ''} onChange={e => update('bonusPolicy', e.target.value)} disabled={readOnly} className="kbt-input" placeholder="HR-Policy-2026" />
        </div>
        <div>
          <label className="kbt-label">วันที่มีผล (Effective Date)</label>
          <input type="date" value={data.effectiveDate?.substring(0, 10) ?? ''} onChange={e => update('effectiveDate', e.target.value || null)} disabled={readOnly} className="kbt-input" />
        </div>
      </div>
    </div>
  )
}
