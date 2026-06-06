import { FileCheck2 } from 'lucide-react'

const APP_VERSION = '0.1.0'

/* Corporate document footer — classification, ownership, and audit framing
   that appears at the foot of every workspace page. */
export default function CorporateFooter() {
  return (
    <footer className="amw-corp-footer" aria-label="Document footer">
      <span className="amw-corp-footer-left">
        © {new Date().getFullYear()} AMW Corporation · Performance Evaluation System
      </span>
      <span className="amw-corp-footer-right">
        <span className="amw-corp-footer-meta">Internal Use Only</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">Classification: Confidential</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">Retention: 7 years</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-audit"><FileCheck2 size={12} /> Activity audited</span>
        <span className="amw-corp-footer-dot" />
        <span className="amw-corp-footer-meta">Ref AMW-PEF/2026 · v{APP_VERSION}</span>
      </span>
    </footer>
  )
}
