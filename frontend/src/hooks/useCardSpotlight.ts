import { useEffect } from 'react'

/* Cursor-reactive depth for `.kbt-metric` cards:
   - 3D tilt toward the pointer (perspective rotateX/rotateY + lift)
   - a radial spotlight that follows the cursor (CSS vars --spot-x/--spot-y)
   Mounted once, rAF-throttled, and disabled under reduced-motion. */
export function useCardSpotlight() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let last: HTMLElement | null = null

    const reset = (el: HTMLElement) => {
      el.style.transform = ''
    }

    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.kbt-metric') as HTMLElement | null
      if (el !== last) {
        if (last) reset(last)
        last = el
      }
      if (!el) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = e.clientX - r.left
        const y = e.clientY - r.top
        el.style.setProperty('--spot-x', `${x}px`)
        el.style.setProperty('--spot-y', `${y}px`)
        const ry = ((x / r.width) - 0.5) * 7   // tilt left/right
        const rx = (0.5 - (y / r.height)) * 7  // tilt up/down
        el.style.transform =
          `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`
      })
    }

    const onLeave = () => {
      if (last) { reset(last); last = null }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])
}
