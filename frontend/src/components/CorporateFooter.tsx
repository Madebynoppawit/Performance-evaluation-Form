import { FileCheck2 } from 'lucide-react'
import { APP_VERSION, RELEASE_FLAVOR_LABEL } from '@/config/release'
import { useT } from '@/i18n/languageContext'

/* Corporate document footer — classification, ownership, and audit framing
   that appears at the foot of every workspace page. */
export default function CorporateFooter() {
  const t = useT()
  return (
    <footer className="amw-corp-footer" aria-label="Document footer">
      <span className="amw-corp-footer-left">
        © {new Date().getFullYear()} AMW Corporation · Performance Evaluation System
      </span>
      <span className="amw-corp-footer-right">
        <span className="amw-corp-footer-meta">{t('corp.internalUse')}</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">{t('corp.classification')}</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">{t('corp.retention')}</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-audit"><FileCheck2 size={12} /> {t('corp.activityAudited')}</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">Ref AMW-PEF/2026 · v{APP_VERSION} · {RELEASE_FLAVOR_LABEL}</span>
      </span>
    </footer>
  )
}
