import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Check, ClipboardList, LayoutTemplate, RefreshCw, Rocket, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import type { Cycle, Evaluation, Template } from '@/types'

interface Step {
  id: string
  label: string
  hint: string
  to: string
  icon: LucideIcon
  done: boolean
}

export default function GettingStarted({ canManage }: { canManage: boolean }) {
  const { data: templates } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) })
  const { data: cycles }    = useQuery<Cycle[]>({ queryKey: ['cycles'], queryFn: () => api.get('/cycles').then(r => r.data) })
  const { data: evaluations } = useQuery<Evaluation[]>({ queryKey: ['evaluations'], queryFn: () => api.get('/evaluations').then(r => r.data) })

  const hasTemplates = (templates?.length ?? 0) > 0
  const hasCycles    = (cycles?.length ?? 0) > 0
  const hasEvals     = (evaluations?.length ?? 0) > 0
  const hasScored    = (evaluations ?? []).some(e => e.totalScore != null)

  const steps: Step[] = [
    { id: 'tpl',  label: 'Create a review template', hint: 'Define weighted sections and competencies', to: '/templates',   icon: LayoutTemplate, done: hasTemplates },
    { id: 'cyc',  label: 'Open a review cycle',       hint: 'Set the period and attach a template',      to: '/cycles',      icon: RefreshCw,      done: hasCycles },
    { id: 'eval', label: 'Run an evaluation',         hint: 'Assign and score an employee review',       to: '/evaluations', icon: ClipboardList,  done: hasEvals },
    { id: 'rpt',  label: 'Review performance insights', hint: 'Explore trends, distribution, and BI',     to: '/reports',     icon: BarChart3,      done: hasScored },
  ]

  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  /* Hide once fully onboarded, or for users who can't perform setup and already have data */
  if (doneCount === steps.length) return null
  if (!canManage && hasEvals) return null

  return (
    <div className="amw-onboard kbt-animate-up">
      <div className="amw-onboard-head">
        <div className="amw-onboard-title">
          <div className="amw-onboard-badge"><Rocket size={18} /></div>
          <div>
            <span>Getting Started</span>
            <strong>Finish setting up AMW Command</strong>
          </div>
        </div>
        <div className="amw-onboard-progress">
          <span>{doneCount}/{steps.length} complete</span>
          <div className="kbt-progress" style={{ width: 140 }}>
            <div className="kbt-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="amw-onboard-steps">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <Link key={s.id} to={s.to} className={`amw-onboard-step${s.done ? ' done' : ''}`} style={{ animationDelay: `${0.05 * i}s` }}>
              <div className="amw-onboard-check">
                {s.done ? <Check size={14} /> : <Icon size={15} />}
              </div>
              <div className="amw-onboard-step-body">
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </div>
              {!s.done && <ArrowRight size={14} className="amw-onboard-arrow" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
