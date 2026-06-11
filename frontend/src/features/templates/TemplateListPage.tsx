import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, LayoutTemplate, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import type { Template } from '@/types'
import { SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useT } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
import Spinner from '@/components/Spinner'

export default function TemplateListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAdmin, canManage } = useAuth()
  const t = useT()
  const { typeLabel } = useLabels()
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const modalRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/templates/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  function startEdit(t: Template) {
    setEditingId(t.id)
    setDraftName(t.name)
  }
  function commitEdit() {
    const name = draftName.trim()
    if (editingId && name && name !== data?.find(t => t.id === editingId)?.name) {
      renameMutation.mutate({ id: editingId, name })
    }
    setEditingId(null)
  }

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
          <span className="amw-eyebrow">{t('page.templates.eyebrow')}</span>
          <h1>{t('page.templates.title')}</h1>
          <p>{t('page.templates.desc')}</p>
        </div>
        {canManage && (
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="kbt-btn-primary">
            {createMutation.isPending ? <Spinner size={15} /> : <Plus size={15} />}
            {createMutation.isPending ? t('common.creating') : t('tmpl.new')}
          </button>
        )}
      </div>

      <div className="kbt-card">
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">{t('tmpl.library')} ({data?.length ?? 0})</span>
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
            title={t('tmpl.noneTitle')}
            description={t('tmpl.noneDesc')}
            action={canManage ? { label: t('tmpl.create'), onClick: () => createMutation.mutate() } : undefined}
          />
        ) : (
          <table className="kbt-table">
            <thead>
              <tr>
                <th>{t('table.template')}</th>
                <th>{t('table.description')}</th>
                <th>{t('table.type')}</th>
                <th style={{ textAlign: 'right' }}>{t('table.sections')}</th>
                <th>{t('table.lastUpdated')}</th>
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
                        background: 'rgba(92,86,144,0.1)',
                        border: '1px solid rgba(92,86,144,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <LayoutTemplate size={14} color="#5c5690" />
                      </div>
                      {editingId === template.id ? (
                        <input
                          autoFocus
                          className="kbt-input amw-inline-edit"
                          value={draftName}
                          onChange={e => setDraftName(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          aria-label="Template name"
                        />
                      ) : (
                        <>
                          <Link
                            to={`/templates/${template.id}`}
                            style={{ fontWeight: 700, color: 'var(--kbt-text)', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#5c5690')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--kbt-text)')}
                          >
                            {template.name}
                          </Link>
                          {canManage && (
                            <button
                              type="button"
                              className="amw-inline-edit-btn"
                              onClick={() => startEdit(template)}
                              aria-label={`Rename ${template.name}`}
                              title="Rename"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{template.description ?? '-'}</td>
                  <td><span className="kbt-badge-info">{typeLabel(template.type)}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'var(--kbt-text)' }}>
                    {template.sections.length}
                  </td>
                  <td style={{ color: 'var(--kbt-text-3)', fontSize: '0.8125rem' }}>{formatDate(template.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Link to={`/templates/${template.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}>
                        {t('common.edit')}
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(template)}
                          className="kbt-btn-danger"
                          style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}
                          aria-label={`Delete template ${template.name}`}
                          title="Delete template"
                        >
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
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(229,35,33,0.12)', border: '1px solid rgba(229,35,33,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#e52321" />
                </div>
                <span>{t('tmpl.deleteTitle')}</span>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
                <X size={15} />
              </button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {t('tmpl.deleteConfirm')} <strong style={{ color: 'var(--kbt-text)' }}>"{deleteTarget.name}"</strong>?
                {' '}{t('tmpl.deleteUndone')}
              </p>
              <div className="kbt-modal-actions">
                <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button
                  onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  disabled={deleteMutation.isPending}
                  className="kbt-btn-danger"
                >
                  <Trash2 size={13} /> {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
