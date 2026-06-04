import { Moon, Sun } from 'lucide-react'
import { useThemeMode } from '@/hooks/useThemeMode'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeMode()
  const isLight = theme === 'light'

  return (
    <div className="kbt-theme-switch" title="Change background mode">
      <button
        type="button"
        className={`kbt-theme-option${isLight ? ' active' : ''}`}
        onClick={() => {
          if (!isLight) toggleTheme()
        }}
        aria-label="Use white background"
      >
        <Sun size={13} /> Light
      </button>
      <button
        type="button"
        className={`kbt-theme-option${!isLight ? ' active' : ''}`}
        onClick={() => {
          if (isLight) toggleTheme()
        }}
        aria-label="Use dark background"
      >
        <Moon size={13} /> Dark
      </button>
    </div>
  )
}
