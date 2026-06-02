import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Plus, X, Calendar, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import type { Cycle, Template } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const STATUS: Record<string, { cls: string; label: string }> = {
  UPCOMING: { cls: 'kbt-badge-info',    label: 'Upcoming' },
  ACTIVE:   { cls: 'kbt-badge-success', label: 'Active' },
  CLOSED:   { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const schema = z.object({
  name: z.string().min(1), templateId: z.string().min(1),
  startDate: z.string().min(1), endDate: z.string().min(1),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CycleListPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [showDialog, setShowDialog] = useState(false)

  const { data: cycles, isLoading } = useQuery<Cycle[]>({ queryKey: ['cycles'], queryFn: () => api.get('/cycles').then(r => r.data) })
  const { data: templates } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/cycles', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cycles'] }); reset(); setShowDialog(false) },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Cycles</h1>
          <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 3 }}>รอบการประเมินผลงาน</p>
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
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#4b5563' }}>Loading...</td></tr>
            ) : !cycles?.length ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#4b5563' }}>No cycles yet</td></tr>
            ) : cycles.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(0,200,122,0.1)', border: '1px solid rgba(0,200,122,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <RefreshCw size={14} color="#00c87a" />
                    </div>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ color: '#94a3b8' }}>{c.template?.name ?? '—'}</td>
                <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDate(c.startDate)}</td>
                <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDate(c.endDate)}</td>
                <td><span className={STATUS[c.status]?.cls ?? 'kbt-badge-neutral'}>{STATUS[c.status]?.label ?? c.status}</span></td>
                <td style={{ color: '#4b5563' }}>{c.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 440,
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,200,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={14} color="#00c87a" />
                </div>
                <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9375rem' }}>Create Evaluation Cycle</span>
              </div>
              <button onClick={() => setShowDialog(false)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="kbt-label kbt-label-required">Cycle Name</label>
                <input {...register('name')} className="kbt-input" placeholder="e.g. Q1 2026" />
                {errors.name && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Required</p>}
              </div>
              <div>
                <label className="kbt-label kbt-label-required">Template</label>
                <select {...register('templateId')} className="kbt-select">
                  <option value="">— Select Template —</option>
                  {templates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.templateId && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Required</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="kbt-label kbt-label-required">Start Date</label>
                  <input {...register('startDate')} type="date" className="kbt-input" />
                </div>
                <div>
                  <label className="kbt-label kbt-label-required">End Date</label>
                  <input {...register('endDate')} type="date" className="kbt-input" />
                </div>
              </div>
              <div>
                <label className="kbt-label">Description</label>
                <input {...register('description')} className="kbt-input" placeholder="Optional description" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={() => setShowDialog(false)} className="kbt-btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="kbt-btn-primary">{isSubmitting ? 'Creating...' : 'Create Cycle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
