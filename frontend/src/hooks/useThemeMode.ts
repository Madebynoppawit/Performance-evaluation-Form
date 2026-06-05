import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'theme-mode'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
    const apply = () => {
      document.documentElement.dataset.theme = next // sync for the View Transition snapshot
      setTheme(next)
    }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (doc.startViewTransition && !reduced) {
      doc.startViewTransition(apply)
    } else {
      apply()
    }
  }, [])

  return { theme, toggleTheme }
}
