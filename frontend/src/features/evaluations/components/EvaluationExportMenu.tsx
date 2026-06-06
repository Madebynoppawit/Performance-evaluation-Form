import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { downloadEvaluationExport, downloadEvaluationPdf, type ExportLanguage } from '@/lib/download'

interface Props {
  evaluationId: string
  employeeName?: string | null
  compact?: boolean
}

type ExportAction = 'csv' | `pdf-${ExportLanguage}`

export default function EvaluationExportMenu({ evaluationId, employeeName, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ExportAction | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function run(action: ExportAction) {
    setActive(action)
    try {
      const base = `evaluation-${employeeName ?? evaluationId}`
      if (action === 'csv') await downloadEvaluationExport(evaluationId, `${base}.csv`)
      if (action === 'pdf-en') await downloadEvaluationPdf(evaluationId, `${base}-en.pdf`, 'en')
      if (action === 'pdf-fr') await downloadEvaluationPdf(evaluationId, `${base}-fr.pdf`, 'fr')
      setOpen(false)
    } finally {
      setActive(null)
    }
  }

  const busy = active != null

  return (
    <div ref={ref} className={`amw-export-menu${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className={compact ? 'kbt-btn-ghost' : 'kbt-btn-report'}
        onClick={() => setOpen(v => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 size={compact ? 12 : 14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={compact ? 12 : 14} />}
        Export
        <ChevronDown size={compact ? 11 : 13} />
      </button>

      {open && (
        <div className="amw-export-popover" role="menu">
          <button type="button" role="menuitem" onClick={() => run('csv')} disabled={busy}>
            <FileSpreadsheet size={15} />
            <span>
              CSV workbook
              <em>Structured HR data export</em>
            </span>
            {active === 'csv' && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          </button>
          <button type="button" role="menuitem" onClick={() => run('pdf-en')} disabled={busy}>
            <FileText size={15} />
            <span>
              PDF report EN
              <em>Board-ready English report</em>
            </span>
            {active === 'pdf-en' && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          </button>
          <button type="button" role="menuitem" onClick={() => run('pdf-fr')} disabled={busy}>
            <FileText size={15} />
            <span>
              PDF report FR
              <em>French executive labels</em>
            </span>
            {active === 'pdf-fr' && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          </button>
        </div>
      )}
    </div>
  )
}
