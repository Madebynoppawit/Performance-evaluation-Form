import { useCallback, useEffect, useState } from 'react'

export interface Preferences {
  defaultWorkspace: 'dashboard' | 'evaluations' | 'reports'
  language: 'en' | 'th' | 'fr'
  evaluationReminders: boolean
  reportUpdates: boolean
  deadlineWarnings: 'priority' | 'all' | 'off'
  sessionProtection: boolean
  personalDataMode: boolean
}

const DEFAULTS: Preferences = {
  defaultWorkspace: 'dashboard',
  language: 'en',
  evaluationReminders: true,
  reportUpdates: true,
  deadlineWarnings: 'priority',
  sessionProtection: true,
  personalDataMode: true,
}

const KEY = 'amw-preferences'

function load(): Preferences {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

/* Local user preferences persisted to localStorage (survives reload).
   UI-layer only — not yet synced to the backend. */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(load)

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(prefs))
  }, [prefs])

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }, [])

  return { prefs, update }
}
