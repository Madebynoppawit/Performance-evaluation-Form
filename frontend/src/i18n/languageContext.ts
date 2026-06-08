import { createContext, useContext } from 'react'
import { DICT, type Locale, type TranslationKey } from './translations'

export const STORAGE_KEY = 'app-locale'

export interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' || stored === 'th' || stored === 'fr' ? stored : 'en'
}

export function translate(locale: Locale, key: TranslationKey) {
  return DICT[locale][key] ?? DICT.en[key] ?? key
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useT() {
  return useLanguage().t
}
