import { useEffect, useRef, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'

/* Thin top loading bar (GitHub/YouTube-style) that fills while any
   react-query request is in flight, then completes and fades out. */
export default function TopProgressBar() {
  const fetching = useIsFetching()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (fetching > 0) {
      setVisible(true)
      setWidth(w => (w < 88 ? 88 : w))
    } else if (visible) {
      setWidth(100)
      timer.current = window.setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
    }
    return () => clearTimeout(timer.current)
  }, [fetching, visible])

  return (
    <div
      className="amw-topbar"
      style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    />
  )
}
