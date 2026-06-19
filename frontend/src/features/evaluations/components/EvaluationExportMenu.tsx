import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { downloadEvaluationExport, downloadEvaluationPdf, type ExportLanguage } from '@/lib/download'

interface Props {
  evaluationId: string
  employeeName?: string | null
  compact?: boolean
  onBeforeExport?: () => Promise<void>
}

type ExportAction = 'csv' | `pdf-${ExportLanguage}`

export default function EvaluationExportMenu({ evaluationId, employeeName, compact, onBeforeExport }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ExportAction | null>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useLayoutEffect(() => {
    if (!open || !ref.current) return

    const updatePosition = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const isPhone = window.matchMedia('(max-width: 640px)').matches
      if (isPhone) {
        setPopoverStyle({ position: 'fixed', left: 12, right: 12, bottom: 16, width: 'auto' })
        return
      }
      const width = 264
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, compact ? rect.right - width : rect.left))
      const top = compact ? rect.top - 8 : rect.bottom + 8
      setPopoverStyle({
        position: 'fixed',
        left,
        top,
        width,
        transform: compact ? 'translateY(-100%)' : undefined,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [compact, open])

  async function run(action: ExportAction) {
    setActive(action)
    try {
      await onBeforeExport?.()
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
  const popover = open ? (
    <div
      ref={popoverRef}
      className="amw-export-popover amw-export-popover-portal"
      role="menu"
      style={popoverStyle}
      onClick={(event) => event.stopPropagation()}
    >
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
  ) : null

  return (
    <div ref={ref} className={`amw-export-menu${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className={compact ? 'kbt-btn-ghost' : 'kbt-btn-report'}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(v => !v)
        }}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 size={compact ? 12 : 14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={compact ? 12 : 14} />}
        Export
        <ChevronDown size={compact ? 11 : 13} />
      </button>

      {popover && createPortal(popover, document.body)}
    </div>
  )
}
