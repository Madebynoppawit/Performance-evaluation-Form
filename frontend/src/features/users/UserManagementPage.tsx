import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pencil, Plus, Search, ShieldAlert, Trash2, Upload, UserCog, X } from 'lucide-react'
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
  employeeNo?: string | null
  _count?: { evaluationsAsEvaluatee: number; evaluationsAsEvaluator: number }
}

interface ImportSummary {
  importId: string
  totalRows: number
  created: number
  updated: number
  failed: number
  errors: { row: number; reason: string; employeeNo?: string; email?: string }[]
}

const ROLE_OPTIONS: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
// Filter chips show the workforce roles individually; Developer + Admin are
// folded into a single "Other" (system-roles) chip.
const ROLE_FILTER_ORDER: Role[] = ['MANAGER', 'EMPLOYEE']
const OTHER_ROLES: Role[] = ['DEVELOPER', 'ADMIN']
const ROLE_LABEL: Record<Role, string> = {
  DEVELOPER: 'Developer', ADMIN: 'Administrator', MANAGER: 'Manager', EMPLOYEE: 'Employee',
}
// Distinct colour per role so they read apart at a glance.
const ROLE_STYLE: Record<Role, { bg: string; border: string; color: string; dot: string }> = {
  DEVELOPER: { bg: 'rgba(168,85,247,0.13)', border: 'rgba(168,85,247,0.4)', color: '#c084fc', dot: '#a855f7' },
  ADMIN:     { bg: 'rgba(237,28,36,0.13)',  border: 'rgba(237,28,36,0.4)',  color: '#f87171', dot: '#ed1c24' },
  MANAGER:   { bg: 'rgba(10,110,209,0.16)', border: 'rgba(10,110,209,0.45)', color: '#4d9fe8', dot: '#0a6ed1' },
  EMPLOYEE:  { bg: 'rgba(148,163,184,0.13)', border: 'rgba(148,163,184,0.32)', color: '#94a3b8', dot: '#94a3b8' },
}

function RoleBadge({ role }: { role: Role }) {
  const s = ROLE_STYLE[role]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />{ROLE_LABEL[role]}
    </span>
  )
}

// Corporate seniority ladder using the AMW brand palette — red (CEO) down
// through navy and the corporate blues to slate/grey, no off-brand hues.
const POSITION_STYLE: Record<Position, { bg: string; border: string; color: string }> = {
  CEO:               { bg: 'rgba(237,28,36,0.14)',   border: 'rgba(237,28,36,0.42)',   color: '#f6717a' }, // amw-red
  MANAGING_DIRECTOR: { bg: 'rgba(41,37,82,0.45)',    border: 'rgba(105,99,170,0.55)',  color: '#9a96d8' }, // amw-navy
  DIRECTOR_UP:       { bg: 'rgba(22,88,142,0.22)',   border: 'rgba(22,88,142,0.5)',    color: '#5a9bd4' }, // m-blue
  MANAGER:           { bg: 'rgba(10,110,209,0.16)',  border: 'rgba(10,110,209,0.45)',  color: '#4d9fe8' }, // sap-blue
  SUPERVISOR:        { bg: 'rgba(129,196,255,0.14)', border: 'rgba(129,196,255,0.4)',  color: '#81c4ff' }, // m-light-blue
  OFFICER:           { bg: 'rgba(53,74,95,0.4)',     border: 'rgba(110,135,160,0.5)',  color: '#8aa1b8' }, // sap-shell slate
  PRODUCTION_STAFF:  { bg: 'rgba(106,109,112,0.2)',  border: 'rgba(106,109,112,0.42)', color: '#9aa0a6' }, // grey
}

function PositionBadge({ position }: { position?: Position | null }) {
  if (!position) return <span style={{ color: 'var(--kbt-text-3)' }}>—</span>
  const s = POSITION_STYLE[position]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {POSITION_LABELS[position]}
    </span>
  )
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
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role | 'OTHER'>('ALL')
  const [positionFilter, setPositionFilter] = useState<'ALL' | Position>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<ImportSummary | null>(null)
  const editRef = useFocusTrap<HTMLDivElement>(!!draft, () => setDraft(null))
  const deleteRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))
  const importRef = useFocusTrap<HTMLDivElement>(importOpen, () => setImportOpen(false))

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

  const importMutation = useMutation({
    mutationFn: async (payload: { text: string; filename: string }) => {
      const { data } = await api.post<ImportSummary>('/users/import', payload.text, {
        params: { filename: payload.filename },
        headers: { 'Content-Type': 'text/csv' },
      })
      return data
    },
    onSuccess: data => { qc.invalidateQueries({ queryKey: ['users'] }); setImportResult(data) },
  })

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = () => importMutation.mutate({ text: String(reader.result ?? ''), filename: file.name })
    reader.readAsText(file)
    e.target.value = ''
  }

  const departments = useMemo(() => {
    const set = new Set<string>()
    users.forEach(u => { if (u.department) set.add(u.department) })
    return Array.from(set).sort()
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter(u => {
        if (roleFilter === 'OTHER') { if (!OTHER_ROLES.includes(u.role)) return false }
        else if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
        if (positionFilter !== 'ALL' && u.position !== positionFilter) return false
        if (deptFilter !== 'ALL' && (u.department ?? '') !== deptFilter) return false
        if (!q) return true
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
          || (u.department ?? '').toLowerCase().includes(q) || (u.employeeNo ?? '').toLowerCase().includes(q)
      })
      // Sort by employee number numerically; rows without one sink to the end by name.
      .sort((a, b) => {
        const na = a.employeeNo ? parseInt(a.employeeNo, 10) : Infinity
        const nb = b.employeeNo ? parseInt(b.employeeNo, 10) : Infinity
        return na !== nb ? na - nb : a.name.localeCompare(b.name)
      })
  }, [users, search, roleFilter, positionFilter, deptFilter])

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {}
    users.forEach(u => { c[u.role] = (c[u.role] ?? 0) + 1 })
    return c
  }, [users])

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setImportResult(null); setImportOpen(true) }} className="kbt-btn-outline">
            <Upload size={15} /> {t('users.import')}
          </button>
          <button onClick={openCreate} className="kbt-btn-primary">
            <Plus size={15} /> {t('users.new')}
          </button>
        </div>
      </div>

      <div className="kbt-card" style={{ padding: 0 }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--kbt-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)' }} />
              <input className="kbt-input" style={{ paddingLeft: 34 }} placeholder={t('users.search')}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="kbt-input" style={{ maxWidth: 190 }} value={positionFilter}
              onChange={e => setPositionFilter(e.target.value as 'ALL' | Position)}>
              <option value="ALL">{t('users.allPositions')}</option>
              {(Object.keys(POSITION_LABELS) as Position[]).map(p => (
                <option key={p} value={p}>{POSITION_LABELS[p]}</option>
              ))}
            </select>
            <select className="kbt-input" style={{ maxWidth: 210 }} value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}>
              <option value="ALL">{t('users.allTeams')}</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{filtered.length} / {users.length}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setRoleFilter('ALL')}
              style={{ height: 28, padding: '0 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${roleFilter === 'ALL' ? 'var(--sap-blue)' : 'var(--kbt-border)'}`,
                background: roleFilter === 'ALL' ? 'rgba(10,110,209,0.15)' : 'transparent',
                color: roleFilter === 'ALL' ? '#4d9fe8' : 'var(--kbt-text-2)' }}>
              {t('common.all')} · {users.length}
            </button>
            {ROLE_FILTER_ORDER.map(r => {
              const s = ROLE_STYLE[r]
              const active = roleFilter === r
              return (
                <button key={r} onClick={() => setRoleFilter(active ? 'ALL' : r)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px', borderRadius: 999,
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${active ? s.border : 'var(--kbt-border)'}`,
                    background: active ? s.bg : 'transparent', color: active ? s.color : 'var(--kbt-text-2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
                  {ROLE_LABEL[r]} · {roleCounts[r] ?? 0}
                </button>
              )
            })}
            <span style={{ width: 1, height: 18, background: 'var(--kbt-border)', margin: '0 4px' }} />
            {(() => {
              const active = roleFilter === 'OTHER'
              const otherCount = OTHER_ROLES.reduce((n, r) => n + (roleCounts[r] ?? 0), 0)
              return (
                <button onClick={() => setRoleFilter(active ? 'ALL' : 'OTHER')}
                  title={OTHER_ROLES.map(r => ROLE_LABEL[r]).join(' · ')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px', borderRadius: 999,
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${active ? 'rgba(110,135,160,0.5)' : 'var(--kbt-border)'}`,
                    background: active ? 'rgba(53,74,95,0.4)' : 'transparent', color: active ? '#8aa1b8' : 'var(--kbt-text-2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6e87a0' }} />
                  {t('users.roleOther')} · {otherCount}
                </button>
              )
            })()}
          </div>
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
                  <th>{t('users.empNo')}</th>
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
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: u.employeeNo ? 'var(--kbt-text-2)' : 'var(--kbt-text-3)' }}>{u.employeeNo ?? '—'}</td>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ color: 'var(--kbt-text-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><PositionBadge position={u.position} /></td>
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
              {deleteMutation.isError && <div className="kbt-msg-error" style={{ fontSize: '0.8125rem' }}>{(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('users.deleteFailed')}</div>}
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

      {importOpen && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setImportOpen(false)}>
          <div className="kbt-modal" ref={importRef} tabIndex={-1} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(10,110,209,0.1)', border: '1px solid rgba(10,110,209,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={14} color="#0a6ed1" />
                </div>
                <span>{t('users.importTitle')}</span>
              </div>
              <button onClick={() => setImportOpen(false)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><X size={15} /></button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ fontSize: '0.8125rem', color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>{t('users.importDesc')}</p>

              <label className={`amw-import-drop${importMutation.isPending ? ' is-busy' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', border: '1px dashed var(--kbt-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--control-bg)' }}>
                {importMutation.isPending ? <Spinner size={18} /> : <Upload size={18} color="var(--sap-blue)" />}
                <strong style={{ fontSize: '0.8125rem' }}>{importMutation.isPending ? t('common.saving') : t('users.importChoose')}</strong>
                <span style={{ fontSize: '0.6875rem', color: 'var(--kbt-text-3)' }}>CSV / TSV · .csv .tsv .txt</span>
                <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={onImportFile}
                  disabled={importMutation.isPending} style={{ display: 'none' }} />
              </label>

              {importMutation.isError && (
                <div className="kbt-msg-error" style={{ fontSize: '0.8125rem' }}>{t('users.importFailed')}</div>
              )}

              {importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--m-light-blue)', fontWeight: 700, fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} /> {t('users.importDone')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { k: t('users.importTotal'), v: importResult.totalRows, c: 'var(--kbt-text)' },
                      { k: t('users.importCreated'), v: importResult.created, c: 'var(--m-light-blue)' },
                      { k: t('users.importUpdated'), v: importResult.updated, c: 'var(--sap-blue)' },
                      { k: t('users.importFailedN'), v: importResult.failed, c: importResult.failed ? 'var(--amw-red)' : 'var(--kbt-text-3)' },
                    ].map(s => (
                      <div key={s.k} style={{ padding: '10px 8px', borderRadius: 8, border: '1px solid var(--kbt-border)', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.1rem', color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--kbt-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.k}</div>
                      </div>
                    ))}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--kbt-border)', borderRadius: 8 }}>
                      {importResult.errors.slice(0, 50).map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderTop: i ? '1px solid var(--kbt-border)' : 'none', fontSize: '0.75rem' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--kbt-text-3)', flexShrink: 0 }}>#{e.row}</span>
                          <span style={{ color: 'var(--kbt-text-2)' }}>{e.reason}{e.email ? ` (${e.email})` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setImportOpen(false)} className="kbt-btn-ghost">{t('common.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
