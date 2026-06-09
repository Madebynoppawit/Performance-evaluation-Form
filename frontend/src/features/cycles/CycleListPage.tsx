import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { AlertTriangle, Calendar, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import type { Cycle, Template } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useT } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
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
  const { cycleStatusLabel } = useLabels()
  const [showDialog, setShowDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null)
  const modalRef = useFocusTrap<HTMLDivElement>(showDialog, () => setShowDialog(false))
  const deleteModalRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cycles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycles'] })
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      setDeleteTarget(null)
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
            <Plus size={15} /> {t('cyc.create')}
          </button>
        )}
      </div>

      <div className="kbt-card">
        <table className="kbt-table">
          <thead>
            <tr>
              <th>{t('table.cycleName')}</th>
              <th>{t('table.template')}</th>
              <th>{t('table.startDate')}</th>
              <th>{t('table.endDate')}</th>
              <th>{t('table.status')}</th>
              <th>{t('table.description')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTableRows rows={4} cols={7} />
            ) : !cycles?.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState
                    icon={Calendar}
                    title={t('cyc.noneTitle')}
                    description={t('cyc.noneDesc')}
                    action={isAdmin ? { label: t('cyc.createAction'), onClick: () => setShowDialog(true) } : undefined}
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
                <td><span className={STATUS[cycle.status]?.cls ?? 'kbt-badge-neutral'}>{cycleStatusLabel(cycle.status)}</span></td>
                <td style={{ color: 'var(--kbt-text-3)' }}>{cycle.description ?? '-'}</td>
                <td>
                  {isAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cycle)}
                        className="kbt-btn-danger"
                        style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}
                        aria-label={`Delete cycle ${cycle.name}`}
                        title="Delete cycle"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </td>
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
                <span>{t('cyc.createTitle')}</span>
              </div>
              <button onClick={() => setShowDialog(false)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="kbt-modal-body">
              <div>
                <label className="kbt-label kbt-label-required">{t('table.cycleName')}</label>
                <input {...register('name')} className="kbt-input" placeholder={t('cyc.namePlaceholder')} />
                {errors.name && <p className="kbt-field-error">{t('common.required')}</p>}
              </div>
              <div>
                <label className="kbt-label kbt-label-required">{t('table.template')}</label>
                <select {...register('templateId')} className="kbt-select" aria-label={t('table.template')}>
                  <option value="">{t('cyc.selectTemplate')}</option>
                  {templates?.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                </select>
                {errors.templateId && <p className="kbt-field-error">{t('common.required')}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="kbt-label kbt-label-required">{t('table.startDate')}</label>
                  <input {...register('startDate')} type="date" className="kbt-input" aria-label={t('table.startDate')} />
                </div>
                <div>
                  <label className="kbt-label kbt-label-required">{t('table.endDate')}</label>
                  <input {...register('endDate')} type="date" className="kbt-input" aria-label={t('table.endDate')} />
                  {errors.endDate && <p className="kbt-field-error">{errors.endDate.message}</p>}
                </div>
              </div>
              <div>
                <label className="kbt-label">{t('table.description')}</label>
                <input {...register('description')} className="kbt-input" placeholder={t('cyc.descPlaceholder')} />
              </div>
              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setShowDialog(false)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="kbt-btn-primary">
                  {isSubmitting && <Spinner size={14} />}
                  {isSubmitting ? t('common.creating') : t('cyc.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
          <div className="kbt-modal" ref={deleteModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Delete cycle" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(237,28,36,0.12)', border: '1px solid rgba(237,28,36,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#ed1c24" />
                </div>
                <span>{t('cyc.deleteTitle')}</span>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }} aria-label="Close delete cycle">
                <X size={15} />
              </button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {t('cyc.deleteConfirm')} <strong style={{ color: 'var(--kbt-text)' }}>"{deleteTarget.name}"</strong>?
                {' '}{t('cyc.deleteWarn')}
              </p>
              <div className="kbt-modal-actions">
                <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="kbt-btn-danger"
                >
                  {deleteMutation.isPending ? <Spinner size={14} /> : <Trash2 size={13} />}
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
