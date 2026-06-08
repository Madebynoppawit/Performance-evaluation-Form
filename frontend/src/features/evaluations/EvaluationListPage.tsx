import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, FileCheck2, Gauge, Plus, RefreshCw, Search, Send, Trash2, TrendingUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import api from '@/lib/api'
import type { Cycle, Evaluation, EvaluationType, Position, User } from '@/types'
import { formatDate } from '@/lib/utils'
import { SkeletonMetricCard, SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import EvaluationExportMenu from './components/EvaluationExportMenu'
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

/* Only supervisory levels (หัวหน้างานขึ้นไป) may act as the evaluator; the
   evaluatee can be anyone. Kept in sync with the backend guard. */
const EVALUATOR_POSITIONS: Position[] = ['DIRECTOR_UP', 'MANAGER', 'SUPERVISOR']

export default function EvaluationListPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const t = useT()
  const { statusLabel, typeLabel } = useLabels()
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null)
  const [draft, setDraft] = useState({
    cycleId: '',
    evaluateeId: '',
    evaluatorId: '',
    type: 'MANAGER' as EvaluationType,
  })
  const createModalRef = useFocusTrap<HTMLDivElement>(showCreateDialog, () => setShowCreateDialog(false))
  const deleteModalRef = useFocusTrap<HTMLDivElement>(!!deleteTarget, () => setDeleteTarget(null))

  const { data, isLoading, refetch, isFetching } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
  })

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => api.get('/cycles').then((r) => r.data),
    enabled: isAdmin && showCreateDialog,
  })

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isAdmin && showCreateDialog,
  })

  // Evaluator must be a supervisor/manager/director; evaluatee can be anyone.
  const evaluatorUsers = useMemo(
    () => users.filter((u) => u.position && EVALUATOR_POSITIONS.includes(u.position)),
    [users]
  )

  const createMutation = useMutation({
    mutationFn: () => api.post('/evaluations', {
      cycleId: draft.cycleId || cycles[0]?.id,
      evaluateeId: draft.evaluateeId || users[0]?.id,
      evaluatorId: draft.evaluatorId || evaluatorUsers[0]?.id,
      type: draft.type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      setShowCreateDialog(false)
      setDraft({ cycleId: '', evaluateeId: '', evaluatorId: '', type: 'MANAGER' })
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

  const scored = (data ?? []).filter((e) => e.totalScore != null)
  const stats = {
    total: data?.length ?? 0,
    completed: data?.filter((e) => ['SUBMITTED', 'REVIEWED', 'CLOSED'].includes(e.status)).length ?? 0,
    avgScore: scored.length ? (scored.reduce((sum, e) => sum + e.totalScore!, 0) / scored.length).toFixed(2) : '-',
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
  const selectedEvaluatorId = draft.evaluatorId || evaluatorUsers[0]?.id || ''
  const canCreate = !!selectedCycleId && !!selectedEvaluateeId && !!selectedEvaluatorId && !createMutation.isPending

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.evaluations.eyebrow')}</span>
          <h1>{t('page.evaluations.title')}</h1>
          <p>{t('page.evaluations.desc')}</p>
        </div>
        {isAdmin && (
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
              onChange={(e) => setSearch(e.target.value)}
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
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td><strong>{ev.cycle?.name ?? ev.cycleId}</strong></td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{typeLabel(ev.type)}</td>
                  <td style={{ fontWeight: 700 }}>{ev.evaluatee?.name ?? ev.evaluateeId}</td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{ev.evaluatee?.department ?? '-'}</td>
                  <td>
                    <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{statusLabel(ev.status)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ev.totalScore != null ? (
                      <span className="kbt-score-value">{ev.totalScore.toFixed(2)}</span>
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
                          onClick={() => setDeleteTarget(ev)}
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
          <div className="kbt-table-footer">{t('common.showing')} {filtered.length} {t('common.of')} {data?.length ?? 0}</div>
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
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(10,110,209,0.1)', border: '1px solid rgba(10,110,209,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} color="#0a6ed1" />
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
              <label>
                {t('table.evaluatee')}
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
              </label>
              <label>
                {t('eval.evaluator')}
                <select
                  className="kbt-input"
                  value={selectedEvaluatorId}
                  onChange={(e) => setDraft((d) => ({ ...d, evaluatorId: e.target.value }))}
                  disabled={usersLoading || createMutation.isPending || evaluatorUsers.length === 0}
                  required
                >
                  {evaluatorUsers.length === 0 && <option value="">{t('eval.noEvaluators')}</option>}
                  {evaluatorUsers.map((person) => (
                    <option key={person.id} value={person.id}>{person.name} - {person.position ?? person.role}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('eval.evaluationType')}
                <select
                  className="kbt-input"
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as EvaluationType }))}
                  disabled={createMutation.isPending}
                >
                  <option value="MANAGER">{typeLabel('MANAGER')}</option>
                  <option value="SELF">{typeLabel('SELF')}</option>
                  <option value="PEER">{typeLabel('PEER')}</option>
                  <option value="THREE_SIXTY">{typeLabel('THREE_SIXTY')}</option>
                </select>
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
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(237,28,36,0.12)', border: '1px solid rgba(237,28,36,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#ed1c24" />
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
