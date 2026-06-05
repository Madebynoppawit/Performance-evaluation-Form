import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Gauge, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import type { Evaluation } from '@/types'
import { formatDate, getTypeLabel } from '@/lib/utils'
import { SkeletonMetricCard, SkeletonTableRows } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED: { cls: 'kbt-badge-info', label: 'Submitted' },
  REVIEWED: { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED: { cls: 'kbt-badge-neutral', label: 'Closed' },
}

export default function EvaluationListPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
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

  const metricItems = [
    { label: 'Total Evaluations', value: stats.total, icon: <TrendingUp size={16} color="var(--sap-blue)" />, color: 'var(--sap-blue)' },
    { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={16} color="var(--m-blue)" />, color: 'var(--m-blue)' },
    { label: 'Avg Score', value: stats.avgScore, icon: <Gauge size={16} color="var(--amw-red)" />, color: 'var(--amw-red)', mono: true },
  ]

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">Evaluation Control</span>
          <h1>Evaluations</h1>
          <p>Monitor active review workflows, ownership, scores, and completion state across the organization.</p>
        </div>
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
          <span className="kbt-toolbar-title">All Evaluations</span>
          <div className="kbt-spacer" />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="kbt-input"
              style={{ paddingLeft: 32, width: 220, height: 32, fontSize: '0.8125rem' }}
            />
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="kbt-btn-ghost" style={{ width: 32, padding: 0 }}>
            <RefreshCw size={13} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {isLoading ? (
          <table className="kbt-table"><tbody><SkeletonTableRows rows={6} cols={8} /></tbody></table>
        ) : !filtered.length ? (
          <EmptyState
            icon={search ? Search : TrendingUp}
            title={search ? 'No matching evaluations' : 'No evaluations yet'}
            description={search
              ? 'Try another search term, cycle name, or employee.'
              : 'Active review workflows will show here with ownership, status, and scores.'}
          />
        ) : (
          <table className="kbt-table">
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Type</th>
                <th>Evaluatee</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td><strong>{ev.cycle?.name ?? ev.cycleId}</strong></td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{getTypeLabel(ev.type)}</td>
                  <td style={{ fontWeight: 700 }}>{ev.evaluatee?.name ?? ev.evaluateeId}</td>
                  <td style={{ color: 'var(--kbt-text-2)' }}>{ev.evaluatee?.department ?? '-'}</td>
                  <td>
                    <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>{STATUS[ev.status]?.label ?? ev.status}</span>
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
                    <Link to={`/evaluations/${ev.id}`} className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}>
                      Open <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="kbt-table-footer">Showing {filtered.length} of {data?.length ?? 0}</div>
        )}
      </div>
    </div>
  )
}
