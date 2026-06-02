import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, RefreshCw, LayoutTemplate } from 'lucide-react'
import api from '@/lib/api'
import type { Template } from '@/types'
import { formatDate, getTypeLabel } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export default function TemplateListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAdmin } = useAuth()

  const { data, isLoading, refetch, isFetching } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/templates', { name: 'New Template', type: 'SELF' }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['templates'] }); navigate(`/templates/${res.data.id}`) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Templates</h1>
          <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 3 }}>แม่แบบฟอร์มประเมินผล</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="kbt-btn-primary"
          >
            <Plus size={15} /> New Template
          </button>
        )}
      </div>

      <div className="kbt-card">
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">Template Library ({data?.length ?? 0})</span>
          <div className="kbt-spacer" />
          <button onClick={() => refetch()} disabled={isFetching} className="kbt-btn-ghost" style={{ width: 32, padding: 0 }}>
            <RefreshCw size={13} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#4b5563' }}>Loading...</div>
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
              {data?.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <LayoutTemplate size={14} color="#3b82f6" />
                      </div>
                      <Link to={`/templates/${t.id}`} style={{ fontWeight: 600, color: '#e2e8f0', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#00c87a')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}>
                        {t.name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{t.description ?? '—'}</td>
                  <td><span className="kbt-badge-info">{getTypeLabel(t.type)}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#e2e8f0' }}>
                    {t.sections.length}
                  </td>
                  <td style={{ color: '#4b5563', fontSize: '0.8125rem' }}>{formatDate(t.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Link to={`/templates/${t.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
                        Edit
                      </Link>
                      {isAdmin && (
                        <button onClick={() => deleteMutation.mutate(t.id)} className="kbt-btn-danger" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
