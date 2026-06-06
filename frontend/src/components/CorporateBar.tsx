import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BadgeCheck, ChevronRight, Clock3, Lock, ShieldCheck } from 'lucide-react'

const LABELS: Record<string, string> = {
  evaluations: 'Evaluations',
  templates: 'Templates',
  cycles: 'Cycles',
  reports: 'Reports',
  account: 'Account',
  settings: 'Settings',
  guidelines: 'Guidelines',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* Enterprise context bar: breadcrumb + document reference, plus governance
   chips (classification, certification, compliance, audit) and a live
   data-freshness indicator — the framing common to corporate systems. */
export default function CorporateBar() {
  const { pathname } = useLocation()
  const seg = pathname.split('/').filter(Boolean)
  const current = seg.length === 0 ? 'Dashboard' : (LABELS[seg[0]] ?? seg[0])
  const time = useClock()

  return (
    <div className="amw-corp-bar">
      <nav className="amw-corp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Workspace</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span aria-current="page">{current}</span>
        <span className="amw-corp-ref">REF · AMW-PEF/2026</span>
      </nav>
      <div className="amw-corp-chips" aria-label="Governance status">
        <span className="amw-corp-synced"><Clock3 size={11} /> Synced {time}</span>
        <span className="amw-corp-chip amw-corp-chip--class"><Lock size={11} /> Confidential</span>
        <span className="amw-corp-chip amw-corp-chip--cert"><BadgeCheck size={11} /> ISO 27001</span>
        <span className="amw-corp-chip">PDPA / GDPR</span>
        <span className="amw-corp-chip amw-corp-chip--audit"><ShieldCheck size={11} /> Audit logged</span>
      </div>
    </div>
  )
}
