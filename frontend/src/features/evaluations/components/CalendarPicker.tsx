import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: string // YYYY-MM-DD or ''
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export function CalendarPicker({ value, onChange, disabled, placeholder = 'เลือกวันที่' }: Props) {
  const today = new Date()
  const initDate = value ? new Date(value + 'T00:00:00') : today

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Position the popup using fixed coords derived from the trigger's bounding rect
  function openCalendar() {
    if (disabled || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popupWidth = 280
    let left = rect.left + rect.width / 2 - popupWidth / 2
    // Keep inside viewport
    left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8))
    setPopupStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left,
      width: popupWidth,
      zIndex: 99999,
    })
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedDate = value ? new Date(value + 'T00:00:00') : null
  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (d: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d

  const isSelected = (d: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === d

  function pick(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  function pickToday() {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
    setOpen(false)
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  })

  const popup = open && createPortal(
    <div ref={popupRef} className="kbt-cal-popover" style={popupStyle}>
      {/* Month navigation */}
      <div className="kbt-cal-header">
        <button type="button" className="kbt-cal-nav" onClick={prevMonth}>
          <ChevronLeft size={15} />
        </button>
        <span className="kbt-cal-month">{monthLabel}</span>
        <button type="button" className="kbt-cal-nav" onClick={nextMonth}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers + day cells */}
      <div className="kbt-cal-grid">
        {DAY_LABELS.map(l => (
          <div key={l} className="kbt-cal-dow">{l}</div>
        ))}
        {cells.map((day, i) => (
          <button
            key={i}
            type="button"
            className={[
              'kbt-cal-day',
              !day ? 'kbt-cal-day--empty' : '',
              day && isToday(day) ? 'kbt-cal-day--today' : '',
              day && isSelected(day) ? 'kbt-cal-day--selected' : '',
            ].join(' ')}
            onClick={() => day && pick(day)}
            disabled={!day}
            tabIndex={day ? 0 : -1}
          >
            {day ?? ''}
          </button>
        ))}
      </div>

      {/* Today shortcut */}
      <div className="kbt-cal-footer">
        <button type="button" className="kbt-cal-today-btn" onClick={pickToday}>
          วันนี้
        </button>
      </div>
    </div>,
    document.body
  )

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        className="kbt-cal-trigger"
        onClick={openCalendar}
        disabled={disabled}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <CalendarDays size={14} color="var(--kbt-text-3)" style={{ flexShrink: 0 }} />
        <span style={{
          flex: 1, textAlign: 'center', fontSize: '0.8125rem',
          color: value ? 'var(--kbt-text)' : 'var(--kbt-text-3)',
        }}>
          {displayValue}
        </span>
      </button>
      {popup}
    </div>
  )
}
