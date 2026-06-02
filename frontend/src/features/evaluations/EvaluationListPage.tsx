import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, RefreshCw, ArrowUpRight, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import type { Evaluation } from '@/types'
import { formatDate, getTypeLabel } from '@/lib/utils'

const STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT:       { cls: 'kbt-badge-neutral', label: 'Draft' },
  IN_PROGRESS: { cls: 'kbt-badge-warning', label: 'In Progress' },
  SUBMITTED:   { cls: 'kbt-badge-info',    label: 'Submitted' },
  REVIEWED:    { cls: 'kbt-badge-success', label: 'Reviewed' },
  CLOSED:      { cls: 'kbt-badge-neutral', label: 'Closed' },
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

  const stats = {
    total:     data?.length ?? 0,
    submitted: data?.filter(e => ['SUBMITTED','REVIEWED','CLOSED'].includes(e.status)).length ?? 0,
    avgScore:  (() => {
      const scored = (data ?? []).filter(e => e.totalScore != null)
      return scored.length ? (scored.reduce((s, e) => s + e.totalScore!, 0) / scored.length).toFixed(2) : '—'
    })(),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            Evaluations
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 3 }}>
            แบบประเมินผลการปฏิบัติงานทั้งหมด
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Evaluations', value: stats.total, icon: <TrendingUp size={16} color="#3b82f6" />, color: '#3b82f6' },
          { label: 'Completed',         value: stats.submitted, icon: <TrendingUp size={16} color="#22c55e" />, color: '#22c55e' },
          { label: 'Avg Score',         value: stats.avgScore, icon: <TrendingUp size={16} color="#00c87a" />, color: '#00c87a', mono: true },
        ].map(({ label, value, icon, color, mono }) => (
          <div key={label} className="kbt-metric">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.6875rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {label}
              </span>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: `rgba(${color === '#3b82f6' ? '59,130,246' : color === '#22c55e' ? '34,197,94' : '0,200,122'},0.1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {icon}
              </div>
            </div>
            <p style={{
              fontSize: '1.75rem', fontWeight: 800, color,
              fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="kbt-card">
        {/* Toolbar */}
        <div className="kbt-toolbar">
          <span className="kbt-toolbar-title">All Evaluations</span>
          <div className="kbt-spacer" />

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="kbt-input"
              style={{ paddingLeft: 32, width: 200, height: 32, fontSize: '0.8125rem' }}
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="kbt-btn-ghost"
            style={{ width: 32, padding: 0 }}
          >
            <RefreshCw size={13} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#4b5563', fontSize: '0.875rem' }}>
            Loading...
          </div>
        ) : !filtered.length ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <TrendingUp size={22} color="#4b5563" />
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.875rem' }}>No evaluations found</p>
          </div>
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
                  <td>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                      {ev.cycle?.name ?? ev.cycleId}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{getTypeLabel(ev.type)}</td>
                  <td style={{ fontWeight: 500 }}>{ev.evaluatee?.name ?? ev.evaluateeId}</td>
                  <td style={{ color: '#94a3b8' }}>{ev.evaluatee?.department ?? '—'}</td>
                  <td>
                    <span className={STATUS[ev.status]?.cls ?? 'kbt-badge-neutral'}>
                      {STATUS[ev.status]?.label ?? ev.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ev.totalScore != null ? (
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700, fontSize: '0.9375rem',
                        background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        {ev.totalScore.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#4b5563' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: '#4b5563', fontSize: '0.8125rem' }}>{formatDate(ev.updatedAt)}</td>
                  <td>
                    <Link
                      to={`/evaluations/${ev.id}`}
                      className="kbt-btn-ghost"
                      style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}
                    >
                      Open <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)',
            fontSize: '0.75rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Showing {filtered.length} of {data?.length ?? 0}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
