import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Lock, ShieldCheck } from 'lucide-react'

const LABELS: Record<string, string> = {
  evaluations: 'Evaluations',
  templates: 'Templates',
  cycles: 'Cycles',
  reports: 'Reports',
  account: 'Account',
  settings: 'Settings',
  guidelines: 'Guidelines',
}

export default function CorporateBar() {
  const { pathname } = useLocation()
  const seg = pathname.split('/').filter(Boolean)
  const current = seg.length === 0 ? 'Dashboard' : (LABELS[seg[0]] ?? seg[0])

  return (
    <div className="amw-corp-bar">
      <nav className="amw-corp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Workspace</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span aria-current="page">{current}</span>
      </nav>
      <div className="amw-corp-chips" aria-label="Governance status">
        <span className="amw-corp-chip amw-corp-chip--class"><Lock size={11} /> Confidential</span>
        <span className="amw-corp-chip">PDPA / GDPR</span>
        <span className="amw-corp-chip amw-corp-chip--audit"><ShieldCheck size={11} /> Audit logged</span>
      </div>
    </div>
  )
}
