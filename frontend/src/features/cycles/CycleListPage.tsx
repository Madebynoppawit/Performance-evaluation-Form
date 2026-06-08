import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Calendar, Plus, RefreshCw, X } from 'lucide-react'
import api from '@/lib/api'
import type { Cycle, Template } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useT } from '@/i18n/languageContext'
import Spinner from '@/components/Spinner'

const STATUS: Record<string, { cls: string; label: string }> = {
  UPCOMING: { cls: 'kbt-badge-info', label: 'Upcoming' },
  ACTIVE: { cls: 'kbt-badge-success', label: 'Active' },
  CLOSED: { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  templateId: z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
  description: z.string().optional(),
}).refine(d => !d.startDate || !d.endDate || d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})
type FormData = z.infer<typeof schema>

export default function CycleListPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const t = useT()
  const [showDialog, setShowDialog] = useState(false)
  const modalRef = useFocusTrap<HTMLDivElement>(showDialog, () => setShowDialog(false))

  const { data: cycles, isLoading } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycles').then(r => r.data),
  })
  const { data: templates } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/cycles', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycles'] })
      reset()
      setShowDialog(false)
    },
  })

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.cycles.eyebrow')}</span>
          <h1>{t('page.cycles.title')}</h1>
          <p>{t('page.cycles.desc')}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowDialog(true)} className="kbt-btn-primary">
            <Plus size={15} /> Create Cycle
          </button>
        )}
      </div>

      <div className="kbt-card">
        <table className="kbt-table">
          <thead>
            <tr>
              <th>Cycle Name</th>
              <th>Template</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTableRows rows={4} cols={6} />
            ) : !cycles?.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={Calendar}
                    title="No cycles yet"
                    description="A cycle defines a review period and attaches a template so evaluations can begin."
                    action={isAdmin ? { label: 'Create cycle', onClick: () => setShowDialog(true) } : undefined}
                  />
                </td>
              </tr>
            ) : cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="kbt-metric-icon"><RefreshCw size={14} color="var(--sap-blue)" /></div>
                    <strong>{cycle.name}</strong>
                  </div>
                </td>
                <td style={{ color: 'var(--kbt-text-2)' }}>{cycle.template?.name ?? '-'}</td>
                <td style={{ color: 'var(--kbt-text-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{formatDate(cycle.startDate)}</td>
                <td style={{ color: 'var(--kbt-text-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{formatDate(cycle.endDate)}</td>
                <td><span className={STATUS[cycle.status]?.cls ?? 'kbt-badge-neutral'}>{STATUS[cycle.status]?.label ?? cycle.status}</span></td>
                <td style={{ color: 'var(--kbt-text-3)' }}>{cycle.description ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDialog && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setShowDialog(false)}>
          <div className="kbt-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Create evaluation cycle" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="kbt-metric-icon"><Calendar size={14} color="var(--sap-blue)" /></div>
                <span>Create Evaluation Cycle</span>
              </div>
              <button onClick={() => setShowDialog(false)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="kbt-modal-body">
              <div>
                <label className="kbt-label kbt-label-required">Cycle Name</label>
                <input {...register('name')} className="kbt-input" placeholder="e.g. Annual Review 2026" />
                {errors.name && <p className="kbt-field-error">Required</p>}
              </div>
              <div>
                <label className="kbt-label kbt-label-required">Template</label>
                <select {...register('templateId')} className="kbt-select">
                  <option value="">Select Template</option>
                  {templates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.templateId && <p className="kbt-field-error">Required</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="kbt-label kbt-label-required">Start Date</label>
                  <input {...register('startDate')} type="date" className="kbt-input" />
                </div>
                <div>
                  <label className="kbt-label kbt-label-required">End Date</label>
                  <input {...register('endDate')} type="date" className="kbt-input" />
                  {errors.endDate && <p className="kbt-field-error">{errors.endDate.message}</p>}
                </div>
              </div>
              <div>
                <label className="kbt-label">Description</label>
                <input {...register('description')} className="kbt-input" placeholder="Optional description" />
              </div>
              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setShowDialog(false)} className="kbt-btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="kbt-btn-primary">
                  {isSubmitting && <Spinner size={14} />}
                  {isSubmitting ? 'Creating…' : 'Create Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
