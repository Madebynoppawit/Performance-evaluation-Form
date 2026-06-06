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
        <span className={`kbt-theme-option${isLight ? ' active' : ''}`} aria-hidden="true">
          <Sun size={14} />
        </span>
        <span className={`kbt-theme-option${!isLight ? ' active' : ''}`} aria-hidden="true">
          <Moon size={14} />
        </span>
      </button>
    </div>
  )
}
