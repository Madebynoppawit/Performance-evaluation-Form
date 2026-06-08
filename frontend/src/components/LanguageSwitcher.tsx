import { Globe } from 'lucide-react'
import { useLanguage } from '@/i18n/languageContext'
import { LOCALES } from '@/i18n/translations'

/* Compact 3-way language selector (EN / TH / FR). */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  return (
    <div className="amw-lang-seg" role="group" aria-label="Language">
      <Globe size={13} className="amw-lang-seg-icon" aria-hidden="true" />
      {LOCALES.map(l => (
        <button
          key={l.id}
          type="button"
          className={locale === l.id ? 'active' : ''}
          onClick={() => setLocale(l.id)}
          aria-pressed={locale === l.id}
          title={l.label}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
