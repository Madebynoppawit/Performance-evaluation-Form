import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, LayoutTemplate, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, getTypeLabel } from '@/lib/utils'
import type { Template } from '@/types'
import { SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import Spinner from '@/components/Spinner'

export default function TemplateListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const modalRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))

  const { data, isLoading, refetch, isFetching } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/templates', { name: 'New Template', type: 'SELF' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      navigate(`/templates/${res.data.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">Form Library</span>
          <h1>Templates</h1>
          <p>Build and manage reusable performance review forms.</p>
        </div>
        {isAdmin && (
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="kbt-btn-primary">
            {createMutation.isPending ? <Spinner size={15} /> : <Plus size={15} />}
            {createMutation.isPending ? 'Creating…' : 'New Template'}
          </button>
        )}
      </div>

      <div className="kbt-card">
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">Template Library ({data?.length ?? 0})</span>
          <div className="kbt-spacer" />
          <button onClick={() => refetch()} disabled={isFetching} className="kbt-btn-ghost" style={{ width: 32, padding: 0 }} aria-label="Refresh templates" title="Refresh">
            <RefreshCw size={13} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {isLoading ? (
          <table className="kbt-table"><tbody><SkeletonTableRows rows={5} cols={6} /></tbody></table>
        ) : !data?.length ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates yet"
            description="Templates define the weighted sections and competencies used across review cycles."
            action={isAdmin ? { label: 'Create template', onClick: () => createMutation.mutate() } : undefined}
          />
        ) : (
          <table className="kbt-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Description</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Sections</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((template) => (
                <tr key={template.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: 'rgba(10,110,209,0.1)',
                        border: '1px solid rgba(10,110,209,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <LayoutTemplate size={14} color="#0a6ed1" />
                      </div>
                      <Link
                        to={`/templates/${template.id}`}
                        style={{ fontWeight: 700, color: 'var(--kbt-text)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#0a6ed1')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--kbt-text)')}
                      >
                        {template.name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{template.description ?? '-'}</td>
                  <td><span className="kbt-badge-info">{getTypeLabel(template.type)}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'var(--kbt-text)' }}>
                    {template.sections.length}
                  </td>
                  <td style={{ color: 'var(--kbt-text-3)', fontSize: '0.8125rem' }}>{formatDate(template.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Link to={`/templates/${template.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
                        Edit
                      </Link>
                      {isAdmin && (
                        <button onClick={() => setDeleteTarget(template)} className="kbt-btn-danger" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {deleteTarget && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
          <div className="kbt-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Delete template" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(237,28,36,0.12)', border: '1px solid rgba(237,28,36,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#ed1c24" />
                </div>
                <span>Delete Template</span>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--kbt-text)' }}>"{deleteTarget.name}"</strong>?
                This action cannot be undone.
              </p>
              <div className="kbt-modal-actions">
                <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost">Cancel</button>
                <button
                  onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  disabled={deleteMutation.isPending}
                  className="kbt-btn-danger"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
