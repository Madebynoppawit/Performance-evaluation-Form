import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, STORAGE_KEY, getInitialLocale, translate } from './languageContext'
import type { Locale } from './translations'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])
  const t = useCallback((key: Parameters<typeof translate>[1]) => translate(locale, key), [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
