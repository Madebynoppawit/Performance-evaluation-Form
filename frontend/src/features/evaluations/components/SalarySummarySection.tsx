import type { SalarySummary } from '@/types'
import { useT } from '@/i18n/languageContext'

interface Props {
  data: SalarySummary
  readOnly?: boolean
  onChange: (data: SalarySummary) => void
}

export default function SalarySummarySection({ data, readOnly, onChange }: Props) {
  const t = useT()
  function update<K extends keyof SalarySummary>(field: K, value: SalarySummary[K]) {
    onChange({ ...data, [field]: value })
  }

  const diff = data.newSalary && data.oldSalary ? data.newSalary - data.oldSalary : null
  const pct = diff && data.oldSalary ? ((diff / data.oldSalary) * 100).toFixed(2) : null
  const fmt = (value?: number | null) => value != null ? value.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="amw-field-grid">
        <div>
          <label className="kbt-label">{t('sal.oldSalary')}</label>
          <input type="number" value={data.oldSalary ?? ''} onChange={e => update('oldSalary', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">{t('sal.newSalary')}</label>
          <input type="number" value={data.newSalary ?? ''} onChange={e => update('newSalary', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
      </div>

      {diff != null && (
        <div className="kbt-summary-total">
          <div>
            <strong>{t('sal.increase')}</strong>
            <span>THB {fmt(diff)}</span>
          </div>
          <span className="kbt-score-value">{pct}%</span>
        </div>
      )}

      <div className="amw-field-grid">
        <div>
          <label className="kbt-label">{t('sal.bonus')}</label>
          <input type="number" value={data.bonus ?? ''} onChange={e => update('bonus', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">{t('sal.bonusDeduction')}</label>
          <input type="number" value={data.bonusDeduction ?? ''} onChange={e => update('bonusDeduction', e.target.value ? Number(e.target.value) : null)} disabled={readOnly} className="kbt-input" placeholder="0.00" />
        </div>
        <div>
          <label className="kbt-label">{t('sal.policyRef')}</label>
          <input value={data.bonusPolicy ?? ''} onChange={e => update('bonusPolicy', e.target.value)} disabled={readOnly} className="kbt-input" placeholder="HR-Policy-2026" />
        </div>
        <div>
          <label className="kbt-label">{t('sal.effectiveDate')}</label>
          <input type="date" value={data.effectiveDate?.substring(0, 10) ?? ''} onChange={e => update('effectiveDate', e.target.value || null)} disabled={readOnly} className="kbt-input" />
        </div>
      </div>
    </div>
  )
}
