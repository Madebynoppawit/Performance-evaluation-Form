import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, Gauge, Plus, RefreshCw, Search, Send, Trash2, TrendingUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import api from '@/lib/api'
import type { Cycle, Evaluation, Position, User } from '@/types'
import { formatDate } from '@/lib/utils'
import { toGpa } from '@/lib/score'
import { SkeletonMetricCard, SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import EvaluationExportMenu from './components/EvaluationExportMenu'
import { POSITION_LABELS } from './constants/competency'
import { useAuth } from '@/hooks/useAuth'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useT } from '@/i18n/languageContext'
import { useLabels } from '@/i18n/useLabels'
import Spinner from '@/components/Spinner'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED: { cls: 'kbt-badge-info', label: 'Submitted' },
  REVIEWED: { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED: { cls: 'kbt-badge-neutral', label: 'Closed' },
}

const CREATE_POSITION_OPTIONS: Array<{ value: string; label: string; position: Position; jobTitle?: string; skipDepartment?: boolean }> = [
  { value: 'CEO', label: 'CEO', position: 'CEO', jobTitle: 'CEO', skipDepartment: true },
  { value: 'MANAGING_DIRECTOR', label: 'Managing Director', position: 'MANAGING_DIRECTOR', jobTitle: 'Managing Director', skipDepartment: true },
  { value: 'DIRECTOR_UP', label: POSITION_LABELS.DIRECTOR_UP, position: 'DIRECTOR_UP' },
  { value: 'MANAGER', label: POSITION_LABELS.MANAGER, position: 'MANAGER' },
  { value: 'OFFICER', label: POSITION_LABELS.OFFICER, position: 'OFFICER' },
  { value: 'SUPERVISOR', label: POSITION_LABELS.SUPERVISOR, position: 'SUPERVISOR' },
  { value: 'PRODUCTION_STAFF', label: POSITION_LABELS.PRODUCTION_STAFF, position: 'PRODUCTION_STAFF' },
]

export default function EvaluationListPage() {
  const qc = useQueryClient()
  const { isAdmin, user, canManage } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const { statusLabel, typeLabel } = useLabels()
  const PAGE_SIZE = 25
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null)
  const [draft, setDraft] = useState({
    cycleId: '',
    evaluateeId: '',
    evaluatorName: '',
    evaluateeMode: 'new' as 'existing' | 'new',
    newName: '',
    newPositionOption: 'OFFICER',
    newDepartment: '',
    matchedEvaluateeId: '',
  })
  const resetDraft = () => setDraft({
    cycleId: '', evaluateeId: '', evaluatorName: '',
    evaluateeMode: 'new', newName: '', newPositionOption: 'OFFICER', newDepartment: '', matchedEvaluateeId: '',
  })
  const [nameListOpen, setNameListOpen] = useState(false)
  const createModalRef = useFocusTrap<HTMLDivElement>(showCreateDialog, () => setShowCreateDialog(false))
  const deleteModalRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))
  // Creating a new employee account is admin/developer-only; everyone else
  // must pick an existing evaluatee.
  const evaluateeMode: 'existing' | 'new' = isAdmin ? draft.evaluateeMode : 'existing'

  const { data, isLoading, refetch, isFetching } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
  })

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycles').then((r) => r.data),
    enabled: canManage && showCreateDialog,
  })

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: canManage && showCreateDialog,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const selectedPosition = CREATE_POSITION_OPTIONS.find((option) => option.value === draft.newPositionOption) ?? CREATE_POSITION_OPTIONS[4]
      return api.post('/evaluations', {
        cycleId: draft.cycleId || cycles[0]?.id,
        evaluatorId: user?.id,
        evaluatorName: draft.evaluatorName.trim() || undefined,
        ...(evaluateeMode === 'new'
          ? (draft.matchedEvaluateeId
              // Name resolved to a real directory user → link them directly.
              ? { evaluateeId: draft.matchedEvaluateeId }
              : {
                  newEvaluatee: {
                    name: draft.newName.trim(),
                    position: selectedPosition.position,
                    jobTitle: selectedPosition.jobTitle,
                    department: selectedPosition.skipDepartment ? undefined : draft.newDepartment.trim() || undefined,
                  },
                })
          : { evaluateeId: draft.evaluateeId || users[0]?.id }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowCreateDialog(false)
      resetDraft()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/evaluations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      setDeleteTarget(null)
    },
  })

  const filtered = (data ?? []).filter((ev) => {
    const q = search.toLowerCase()
    return !q || ev.cycle?.name?.toLowerCase().includes(q) || ev.evaluatee?.name?.toLowerCase().includes(q)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const scored = (data ?? []).filter((e) => e.totalScore != null)
  const stats = {
    total: data?.length ?? 0,
    completed: data?.filter((e) => ['SUBMITTED', 'REVIEWED', 'CLOSED'].includes(e.status)).length ?? 0,
    avgScore: scored.length ? toGpa(scored.reduce((sum, e) => sum + e.totalScore!, 0) / scored.length).toFixed(2) : '-',
  }
  const commandQueue = useMemo(() => {
    const list = data ?? []
    const now = Date.now()
    const open = list.filter((ev) => !['REVIEWED', 'CLOSED'].includes(ev.status))
    const stale = open.filter((ev) => now - new Date(ev.updatedAt).getTime() > 3 * 24 * 60 * 60 * 1000)
    const readyToClose = list.filter((ev) => ev.status === 'SUBMITTED' && ev.totalScore != null)
    const activeCycles = list
      .map((ev) => ev.cycle)
      .filter((cycle): cycle is NonNullable<Evaluation['cycle']> => !!cycle && cycle.status === 'ACTIVE')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    const nextCycle = activeCycles[0]
    const departmentPending = open.reduce<Record<string, number>>((acc, ev) => {
      const department = ev.evaluatee?.department ?? 'Unassigned'
      acc[department] = (acc[department] ?? 0) + 1
      return acc
    }, {})
    const busiestDepartment = Object.entries(departmentPending).sort((a, b) => b[1] - a[1])[0]

    return {
      openCount: open.length,
      staleCount: stale.length,
      readyToCloseCount: readyToClose.length,
      nextCycleName: nextCycle?.name ?? 'No active cycle',
      nextCycleDaysLeft: nextCycle
        ? Math.max(0, Math.ceil((new Date(nextCycle.endDate).getTime() - now) / (24 * 60 * 60 * 1000)))
        : null,
      busiestDepartment: busiestDepartment
        ? { name: busiestDepartment[0], count: busiestDepartment[1] }
        : null,
    }
  }, [data])

  const metricItems = [
    { label: t('dash.metric.total'), value: stats.total, icon: <TrendingUp size={16} color="var(--sap-blue)" />, color: 'var(--sap-blue)' },
    { label: t('dash.metric.completed'), value: stats.completed, icon: <CheckCircle2 size={16} color="var(--m-blue)" />, color: 'var(--m-blue)' },
    { label: t('dash.metric.avg'), value: stats.avgScore, icon: <Gauge size={16} color="var(--amw-red)" />, color: 'var(--amw-red)', mono: true },
  ]
  const selectedCycleId = draft.cycleId || cycles[0]?.id || ''
  const selectedEvaluateeId = draft.evaluateeId || users[0]?.id || ''
  const selectedPosition = CREATE_POSITION_OPTIONS.find((option) => option.value === draft.newPositionOption) ?? CREATE_POSITION_OPTIONS[4]
  const evaluateeOk = evaluateeMode === 'new' ? draft.newName.trim().length > 0 : !!selectedEvaluateeId
  const canCreate = !!selectedCycleId && evaluateeOk && draft.evaluatorName.trim().length > 0 && !!user?.id && !createMutation.isPending

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.evaluations.eyebrow')}</span>
          <h1>{t('page.evaluations.title')}</h1>
          <p>{t('page.evaluations.desc')}</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreateDialog(true)} className="kbt-btn-primary">
            <Plus size={15} /> {t('eval.new')}
          </button>
        )}
      </div>

      <div className="kbt-metric-grid kbt-metric-grid-3">
        {isLoading
          ? [0, 1, 2].map(i => <SkeletonMetricCard key={i} />)
          : metricItems.map(({ label, value, icon, color, mono }) => (
            <div key={label} className="kbt-metric kbt-animate-up">
              <div className="kbt-metric-head">
                <span>{label}</span>
                <div className="kbt-metric-icon">{icon}</div>
              </div>
              <strong style={{ color, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</strong>
            </div>
          ))
        }
      </div>

      <div className="kbt-card">
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">{t('eval.all')}</span>
          <div className="kbt-spacer" />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={t('common.search')}
              className="kbt-input"
              style={{ paddingLeft: 32, width: 220, height: 32, fontSize: '0.8125rem' }}
            />
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="kbt-btn-ghost" style={{ width: 32, padding: 0 }} aria-label="Refresh evaluations" title="Refresh">
            <RefreshCw size={13} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {isLoading ? (
          <table className="kbt-table"><tbody><SkeletonTableRows rows={6} cols={8} /></tbody></table>
        ) : !filtered.length ? (
          <EmptyState
            icon={search ? Search : TrendingUp}
            title={search ? t('eval.noMatching') : t('dash.noEvalsTitle')}
            description={search ? t('eval.noMatchingDesc') : t('eval.noneDesc')}
          />
        ) : (
          <table className="kbt-table">
            <thead>
              <tr>
                <th>{t('table.cycle')}</th>
                <th>{t('table.type')}</th>
                <th>{t('table.evaluatee')}</th>
                <th>{t('table.department')}</th>
                <th>{t('table.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('table.score')}</th>
                <th>{t('table.updated')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((ev) => (
                <tr key={ev.id}
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <td><strong>{ev.cycle?.name ?? ev.cycleId}</strong></td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{typeLabel(ev.type)}</td>
                  <td style={{ fontWeight: 700 }}>{ev.evaluatee?.name ?? ev.evaluateeId}</td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{ev.evaluatee?.department ?? '-'}</td>
                  <td>
                    <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{statusLabel(ev.status)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ev.totalScore != null ? (
                      <span className="kbt-score-value">{toGpa(ev.totalScore).toFixed(2)}</span>
                    ) : (
                      <span style={{ color: 'var(--kbt-text-3)' }}>-</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--kbt-text-3)', fontSize: '0.8125rem' }}>{formatDate(ev.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <EvaluationExportMenu compact evaluationId={ev.id} employeeName={ev.evaluatee?.name} />
                      <Link to={`/evaluations/${ev.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}>
                        {t('common.open')} <ArrowUpRight size={11} />
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(ev) }}
                          className="kbt-btn-danger"
                          style={{ height: 28, padding: '0 10px', fontSize: '0.75rem' }}
                          aria-label={`Delete evaluation for ${ev.evaluatee?.name ?? ev.evaluateeId}`}
                          title="Delete evaluation"
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

        {!isLoading && filtered.length > 0 && (
          <div className="kbt-table-footer" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{t('common.showing')} {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {t('common.of')} {filtered.length}</span>
            {totalPages > 1 && (
              <>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button
                    className="kbt-btn-ghost"
                    style={{ height: 26, width: 26, padding: 0 }}
                    disabled={safePage === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--kbt-text-2)', padding: '0 6px' }}>
                    {safePage} / {totalPages}
                  </span>
                  <button
                    className="kbt-btn-ghost"
                    style={{ height: 26, width: 26, padding: 0 }}
                    disabled={safePage === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!isLoading && (data?.length ?? 0) > 0 && (
        <section className="amw-eval-command">
          <div className="amw-eval-command-head">
            <div>
              <span className="amw-eyebrow">{t('eval.commandQueue')}</span>
              <h2>{t('eval.nextActions')}</h2>
            </div>
            <Link to="/reports" className="kbt-btn-report">
              <Gauge size={14} /> {t('eval.viewBI')}
            </Link>
          </div>

          <div className="amw-eval-command-grid">
            <div className="amw-eval-action-card primary">
              <div className="amw-eval-action-icon"><Send size={18} /></div>
              <div>
                <span>{t('eval.openWorkflow')}</span>
                <strong>{commandQueue.openCount}</strong>
                <p>{t('eval.openWorkflowDesc')}</p>
              </div>
            </div>
            <div className="amw-eval-action-card">
              <div className="amw-eval-action-icon warning"><AlertTriangle size={18} /></div>
              <div>
                <span>{t('dash.staleReviews')}</span>
                <strong>{commandQueue.staleCount}</strong>
                <p>{t('eval.staleReviewsDesc')}</p>
              </div>
            </div>
            <div className="amw-eval-action-card">
              <div className="amw-eval-action-icon success"><FileCheck2 size={18} /></div>
              <div>
                <span>{t('eval.readyToClose')}</span>
                <strong>{commandQueue.readyToCloseCount}</strong>
                <p>{t('eval.readyToCloseDesc')}</p>
              </div>
            </div>
            <div className="amw-eval-action-card">
              <div className="amw-eval-action-icon"><CalendarClock size={18} /></div>
              <div>
                <span>{t('dash.cycleDeadline')}</span>
                <strong>{commandQueue.nextCycleDaysLeft == null ? 'n/a' : `${commandQueue.nextCycleDaysLeft}d`}</strong>
                <p>{commandQueue.nextCycleName}</p>
              </div>
            </div>
          </div>

          <div className="amw-eval-command-strip">
            <div>
              <span>{t('eval.highestConcentration')}</span>
              <strong>{commandQueue.busiestDepartment?.name ?? t('eval.noDeptRisk')}</strong>
            </div>
            <em>{commandQueue.busiestDepartment?.count ?? 0} {t('eval.openSuffix')}</em>
          </div>
        </section>
      )}

      {showCreateDialog && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setShowCreateDialog(false)}>
          <div className="kbt-modal" ref={createModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Add evaluation" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(92,86,144,0.1)', border: '1px solid rgba(92,86,144,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} color="#5c5690" />
                </div>
                <span>{t('eval.addEvaluation')}</span>
              </div>
              <button onClick={() => setShowCreateDialog(false)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }} aria-label="Close add evaluation">
                <X size={15} />
              </button>
            </div>
            <form
              className="kbt-modal-body"
              onSubmit={(e) => {
                e.preventDefault()
                if (canCreate) createMutation.mutate()
              }}
            >
              <label>
                {t('table.cycle')}
                <select
                  className="kbt-input"
                  value={selectedCycleId}
                  onChange={(e) => setDraft((d) => ({ ...d, cycleId: e.target.value }))}
                  disabled={cyclesLoading || createMutation.isPending}
                  required
                >
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('table.evaluatee')}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, evaluateeMode: d.evaluateeMode === 'new' ? 'existing' : 'new' }))}
                      style={{ background: 'none', border: 'none', color: 'var(--sap-blue)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {draft.evaluateeMode === 'new'
                        ? (<><X size={11} /> {t('eval.pickExisting')}</>)
                        : (<><Plus size={11} /> {t('eval.addEmployee')}</>)}
                    </button>
                  )}
                </div>
                {evaluateeMode === 'existing' ? (
                  <select
                    className="kbt-input"
                    value={selectedEvaluateeId}
                    onChange={(e) => setDraft((d) => ({ ...d, evaluateeId: e.target.value }))}
                    disabled={usersLoading || createMutation.isPending}
                    required
                  >
                    {users.map((person) => (
                      <option key={person.id} value={person.id}>{person.name} - {person.department ?? person.role}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="kbt-input"
                        placeholder={t('eval.employeeName')}
                        value={draft.newName}
                        autoComplete="off"
                        onFocus={() => setNameListOpen(true)}
                        onBlur={() => window.setTimeout(() => setNameListOpen(false), 150)}
                        onChange={(e) => {
                          const name = e.target.value
                          setNameListOpen(true)
                          const match = users.find((u) => u.name.trim().toLowerCase() === name.trim().toLowerCase())
                          setDraft((d) => match
                            ? {
                                ...d,
                                newName: name,
                                matchedEvaluateeId: match.id,
                                newPositionOption: CREATE_POSITION_OPTIONS.find((o) => o.position === match.position)?.value ?? d.newPositionOption,
                                newDepartment: match.department ?? '',
                              }
                            : { ...d, newName: name, matchedEvaluateeId: '' })
                        }}
                        disabled={createMutation.isPending}
                        autoFocus
                        required
                      />
                      {nameListOpen && (() => {
                        const q = draft.newName.trim().toLowerCase()
                        const matches = users.filter((u) => !q || u.name.toLowerCase().includes(q)).slice(0, 8)
                        if (matches.length === 0) return null
                        return (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
                            background: 'var(--kbt-card)', border: '1px solid var(--kbt-border-2)', borderRadius: 12,
                            overflow: 'hidden', maxHeight: 248, overflowY: 'auto', boxShadow: 'var(--elevated-shadow)' }}>
                            {matches.map((person, i) => (
                              <button type="button" key={person.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setDraft((d) => ({
                                    ...d,
                                    newName: person.name,
                                    matchedEvaluateeId: person.id,
                                    newPositionOption: CREATE_POSITION_OPTIONS.find((o) => o.position === person.position)?.value ?? d.newPositionOption,
                                    newDepartment: person.department ?? '',
                                  }))
                                  setNameListOpen(false)
                                }}
                                style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', textAlign: 'left',
                                  padding: '9px 12px', background: 'transparent', border: 'none',
                                  borderTop: i ? '1px solid var(--kbt-border)' : 'none', cursor: 'pointer', color: 'var(--kbt-text)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229,35,33,0.1)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{person.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--kbt-text-3)' }}>
                                  {person.position ? POSITION_LABELS[person.position] : person.role}{person.department ? ` · ${person.department}` : ''}
                                </span>
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                    {draft.matchedEvaluateeId && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--m-light-blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> {t('eval.mappedFromDirectory')}
                      </span>
                    )}
                    <select
                      className="kbt-input"
                      value={draft.newPositionOption}
                      onChange={(e) => {
                        const option = CREATE_POSITION_OPTIONS.find((item) => item.value === e.target.value)
                        setDraft((d) => ({
                          ...d,
                          newPositionOption: e.target.value,
                          newDepartment: option?.skipDepartment ? '' : d.newDepartment,
                        }))
                      }}
                      disabled={createMutation.isPending || !!draft.matchedEvaluateeId}
                      aria-label={t('acc.position')}
                    >
                      {CREATE_POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {!selectedPosition.skipDepartment && (
                      <textarea
                        className="kbt-textarea amw-create-longfield"
                        placeholder={t('eval.employeeDept')}
                        value={draft.newDepartment}
                        onChange={(e) => setDraft((d) => ({ ...d, newDepartment: e.target.value }))}
                        disabled={createMutation.isPending || !!draft.matchedEvaluateeId}
                      />
                    )}
                  </div>
                )}
              </div>
              <label>
                {t('eval.evaluator')}
                <textarea
                  className="kbt-textarea amw-create-longfield"
                  placeholder={t('eval.evaluatorNamePlaceholder')}
                  value={draft.evaluatorName}
                  onChange={(e) => setDraft((d) => ({ ...d, evaluatorName: e.target.value }))}
                  disabled={createMutation.isPending}
                  required
                />
              </label>
              <div className="kbt-modal-actions">
                <button type="button" onClick={() => setShowCreateDialog(false)} className="kbt-btn-ghost">{t('common.cancel')}</button>
                <button type="submit" disabled={!canCreate} className="kbt-btn-primary">
                  {createMutation.isPending ? <Spinner size={14} /> : <Plus size={13} />}
                  {t('eval.addEvaluation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="kbt-modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
          <div className="kbt-modal" ref={deleteModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Delete evaluation" onMouseDown={e => e.stopPropagation()}>
            <div className="kbt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(229,35,33,0.12)', border: '1px solid rgba(229,35,33,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#e52321" />
                </div>
                <span>{t('eval.deleteTitle')}</span>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="kbt-btn-ghost" style={{ width: 28, height: 28, padding: 0 }} aria-label="Close delete evaluation">
                <X size={15} />
              </button>
            </div>
            <div className="kbt-modal-body">
              <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {t('eval.deleteFor')} <strong style={{ color: 'var(--kbt-text)' }}>{deleteTarget.evaluatee?.name ?? deleteTarget.evaluateeId}</strong>
                {' '}{t('eval.deleteIn')} <strong style={{ color: 'var(--kbt-text)' }}>{deleteTarget.cycle?.name ?? deleteTarget.cycleId}</strong>?
                {' '}{t('eval.deleteWarn')}
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
