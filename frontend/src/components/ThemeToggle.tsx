import { Moon, Sun } from 'lucide-react'
import { useThemeMode } from '@/hooks/useThemeMode'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeMode()
  const isLight = theme === 'light'

  return (
    <div className={`kbt-theme-switch${isLight ? ' is-light' : ' is-dark'}`} title="Change background mode">
      <button
        type="button"
        className="kbt-theme-slider"
        onClick={toggleTheme}
        aria-label={isLight ? 'Switch to dark background' : 'Switch to white background'}
        aria-pressed={!isLight}
      >
        <span className="kbt-theme-thumb" />
        <span className={`kbt-theme-option${isLight ? ' active' : ''}`}>
          <Sun size={13} /> Light
        </span>
        <span className={`kbt-theme-option${!isLight ? ' active' : ''}`}>
          <Moon size={13} /> Dark
        </span>
      </button>
    </div>
  )
}
