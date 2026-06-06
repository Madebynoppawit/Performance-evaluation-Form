import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BadgeCheck, ChevronRight, Clock3, FileLock2, Scale, ShieldCheck } from 'lucide-react'

const LABELS: Record<string, string> = {
  evaluations: 'Evaluations',
  templates: 'Templates',
  cycles: 'Cycles',
  reports: 'Reports',
  account: 'Account',
  settings: 'Settings',
  guidelines: 'Guidelines',
}

/* Per-section document reference codes (AMW-PEF / <code> / <year>). */
const REF_CODES: Record<string, string> = {
  '': 'DASH',
  evaluations: 'EVAL',
  templates: 'TMPL',
  cycles: 'CYCL',
  reports: 'RPT',
  account: 'ACCT',
  settings: 'CFG',
  guidelines: 'DOC',
}

/* Deployment environment: explicit VITE_APP_ENV, else infer from build mode. */
const ENV = (import.meta.env.VITE_APP_ENV || (import.meta.env.PROD ? 'PROD' : 'DEV')).toUpperCase()
const ENV_CLASS = ENV === 'PROD' ? 'prod' : ENV === 'UAT' || ENV === 'STAGING' ? 'uat' : 'dev'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* Enterprise context bar: environment badge + breadcrumb + per-section
   document reference, governance chips, and a live data-freshness clock. */
export default function CorporateBar() {
  const { pathname } = useLocation()
  const seg = pathname.split('/').filter(Boolean)
  const key = seg[0] ?? ''
  const current = key === '' ? 'Dashboard' : (LABELS[key] ?? key)
  const ref = `AMW-PEF/${REF_CODES[key] ?? 'GEN'}/${new Date().getFullYear()}`
  const time = useClock()

  return (
    <div className="amw-corp-bar">
      <div className="amw-corp-left">
        <span className={`amw-corp-env amw-corp-env--${ENV_CLASS}`} title={`Environment: ${ENV}`}>
          <span className="amw-corp-env-dot" /> {ENV}
        </span>
        <nav className="amw-corp-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Workspace</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{current}</span>
        </nav>
        <span className="amw-corp-ref" title="Document reference">{ref}</span>
      </div>
      <div className="amw-corp-chips" aria-label="Governance status">
        <span className="amw-corp-synced"><Clock3 size={11} /> Synced {time}</span>
        <span className="amw-corp-chip amw-corp-chip--class"><FileLock2 size={11} /> Confidential</span>
        <span className="amw-corp-chip amw-corp-chip--cert"><BadgeCheck size={11} /> ISO 27001</span>
        <span className="amw-corp-chip amw-corp-chip--comply"><Scale size={11} /> PDPA · GDPR</span>
        <span className="amw-corp-chip amw-corp-chip--audit"><ShieldCheck size={11} /> Audit Trail</span>
      </div>
    </div>
  )
}
