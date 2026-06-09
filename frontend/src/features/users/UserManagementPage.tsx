import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, ShieldAlert, Trash2, UserCog, X } from 'lucide-react'
import api from '@/lib/api'
import type { Position, Role } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { POSITION_LABELS } from '../evaluations/constants/competency'
import EmptyState from '@/components/EmptyState'
import Spinner from '@/components/Spinner'

interface ManagedUser {
  id: string
  email: string
  name: string
  role: Role
  position?: Position | null
  department?: string | null
  jobTitle?: string | null
  _count?: { evaluationsAsEvaluatee: number; evaluationsAsEvaluator: number }
}

const ROLE_OPTIONS: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
const ROLE_LABEL: Record<Role, string> = {
  DEVELOPER: 'Developer', ADMIN: 'Administrator', MANAGER: 'Manager', EMPLOYEE: 'Employee',
}
const ROLE_BADGE: Record<Role, string> = {
  DEVELOPER: 'kbt-badge-info', ADMIN: 'kbt-badge-success', MANAGER: 'kbt-badge-warning', EMPLOYEE: 'kbt-badge-neutral',
}

type Draft = {
  id: string | null
  name: string
  email: string
  role: Role
  position: '' | Position
  department: string
  jobTitle: string
  password: string
}

const emptyDraft = (): Draft => ({
  id: null, name: '', email: '', role: 'EMPLOYEE', position: '', department: '', jobTitle: '', password: '',
})

export default function UserManagementPage() {
  const t = useT()
  const qc = useQueryClient()
  const { isAdmin, user } = useAuth()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const editRef = useFocusTrap<HTMLDivElement>(!!draft, () => setDraft(null))
  const deleteRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))

  const { data: users = [], isLoading } = useQuery<ManagedUser[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return
      const base = {
        name: draft.name.trim(),
        role: draft.role,
        position: draft.position || undefined,
        department: draft.department.trim() || undefined,
        jobTitle: draft.jobTitle.trim() || null,
      }
      if (draft.id) {
        const payload: Record<string, unknown> = { ...base }
        if (draft.password) payload.password = draft.password
        await api.patch(`/users/${draft.id}`, payload)
      } else {
        await api.post('/users', { ...base, email: draft.email.trim(), password: draft.password })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDraft(null); setFormError(null) },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setFormError(err.response?.data?.message ?? t('users.saveFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.department ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

  function openCreate() { setFormError(null); setDraft(emptyDraft()) }
  function openEdit(u: ManagedUser) {
    setFormError(null)
    setDraft({
      id: u.id, name: u.name, email: u.email, role: u.role,
      position: (u.position ?? '') as '' | Position,
      department: u.department ?? '', jobTitle: u.jobTitle ?? '', password: '',
    })
  }

  if (!isAdmin) {
    return (
      <div className="kbt-page">
        <EmptyState icon={ShieldAlert} title={t('users.forbidden')} description={t('users.forbiddenDesc')} />
      </div>
    )
  }

  const isEditing = !!draft?.id
  const canSave = !!draft && draft.name.trim() && (isEditing || (draft.email.trim() && draft.password.length >= 6)) && !saveMutation.isPending

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.users.eyebrow')}</span>
          <h1>{t('page.users.title')}</h1>
          <p>{t('page.users.desc')}</p>
        </div>
        <button onClick={openCreate} className="kbt-btn-primary">
          <Plus size={15} /> {t('users.new')}
        </button>
      </div>

      <div className="kbt-card" style={{ padding: 0 }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--kbt-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)' }} />
            <input className="kbt-input" style={{ paddingLeft: 34 }} placeholder={t('users.search')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>{filtered.length} / {users.length}</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={20} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={UserCog} title={t('users.empty')} description={t('users.emptyDesc')} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="kbt-table">
              <thead>
                <tr>
                  <th>{t('acc.displayName')}</th>
                  <th>{t('acc.email')}</th>
                  <th>{t('acc.role')}</th>
                  <th>{t('acc.position')}</th>
                  <th>{t('acc.department')}</th>
                  <th style={{ textAlign: 'right' }}>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ color: 'var(--kbt-text-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td><span className={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</span></td>
                    <td style={{ color: 'var(--kbt-text-2)' }}>{u.position ? POSITION_LABELS[u.position] : '-'}</td>
                    <td style={{ color: 'var(--kbt-text-2)' }}>{u.department ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="kbt-btn-ghost" style={{ height: 30, padding: '0 10px', gap: 5 }} onClick={() => openEdit(u)}>
                          <Pencil size={13} /> {t('common.edit')}
                        </button>
                        <button className="kbt-btn-ghost" style={{ height: 30, width: 30, padding: 0 }}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? t('users.cannotDeleteSelf') : t('users.delete')}
                          onClick={() => setDeleteTarget(u)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {draft && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setDraft(null)}>
          <div className="kbt-modal" ref={editRef} tabIndex={-1} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(10,110,209,0.1)', border: '1px solid rgba(10,110,209,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCog size={14} color="#0a6ed1" />
                </div>
                <span>{isEditing ? t('users.edit') : t('users.new')}</span>
              </div>
              <button onClick={() => setDraft(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><X size={15} /></button>
            </div>
            <form className="kbt-modal-body" onSubmit={e => { e.preventDefault(); if (canSave) saveMutation.mutate() }}>
              {formError && <div className="kbt-msg-error" style={{ fontSize: '0.8125rem' }}>{formError}</div>}
              <label>
                {t('acc.displayName')}
                <input className="kbt-input" value={draft.name} onChange={e => setDraft(d => d && ({ ...d, name: e.target.value }))} required />
              </label>
              <label>
                {t('acc.email')}
                <input className="kbt-input" type="email" value={draft.email} disabled={isEditing}
                  onChange={e => setDraft(d => d && ({ ...d, email: e.target.value }))}
                  placeholder="user@amw-ems.com" required={!isEditing} />
              </label>
              <label>
                {t('acc.role')}
                <select className="kbt-input" value={draft.role} onChange={e => setDraft(d => d && ({ ...d, role: e.target.value as Role }))}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>
              <label>
                {t('acc.position')}
                <select className="kbt-input" value={draft.position} onChange={e => setDraft(d => d && ({ ...d, position: e.target.value as '' | Position }))}>
                  <option value="">{t('acc.notAssigned')}</option>
                  {(Object.keys(POSITION_LABELS) as Position[]).map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
                </select>
              </label>
              <label>
                {t('acc.department')}
                <input className="kbt-input" value={draft.department} onChange={e => setDraft(d => d && ({ ...d, department: e.target.value }))} />
              </label>
              <label>
                {t('acc.jobTitle')}
                <input className="kbt-input" value={draft.jobTitle} onChange={e => setDraft(d => d && ({ ...d, jobTitle: e.target.value }))} />
              </label>
              <label>
                {isEditing ? t('acc.newPassword') : t('users.password')}
                <input className="kbt-input" type="password" autoComplete="new-password" value={draft.password}
                  onChange={e => setDraft(d => d && ({ ...d, password: e.target.value }))}
                  placeholder={isEditing ? t('acc.newPasswordHint') : '••••••••'} required={!isEditing} />
              </label>
              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setDraft(null)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button type="submit" disabled={!canSave} className="kbt-btn-primary">
                  {saveMutation.isPending ? <Spinner size={14} /> : null}
                  {isEditing ? t('common.saveChanges') : t('users.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
          <div className="kbt-modal" ref={deleteRef} tabIndex={-1} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(237,28,36,0.12)', border: '1px solid rgba(237,28,36,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={14} color="#ed1c24" />
                </div>
                <span>{t('users.delete')}</span>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><X size={15} /></button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--kbt-text-2)' }}>
                {t('users.deleteConfirm')} <strong style={{ color: 'var(--kbt-text)' }}>{deleteTarget.name}</strong>?
              </p>
              {deleteMutation.isError && <div className="kbt-msg-error" style={{ fontSize: '0.8125rem' }}>{t('users.deleteFailed')}</div>}
              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button type="button" className="kbt-btn-danger" disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}>
                  {deleteMutation.isPending ? <Spinner size={14} /> : <Trash2 size={13} />} {t('users.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
