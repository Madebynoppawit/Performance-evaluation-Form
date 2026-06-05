import { useEffect } from 'react'

/* Tracks the cursor over `.kbt-metric` cards and writes its position to
   CSS vars (--spot-x / --spot-y) so a radial highlight can follow the mouse.
   Mounted once; throttled with requestAnimationFrame. */
export function useCardSpotlight() {
  useEffect(() => {
    let raf = 0
    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.kbt-metric') as HTMLElement | null
      if (!el) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
        el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
}
