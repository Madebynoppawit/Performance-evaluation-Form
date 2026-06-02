import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardList, Users, TrendingUp, CheckCircle2, ArrowUpRight, Plus, RefreshCw, BarChart2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import { getTypeLabel } from '@/lib/utils'
import type { Evaluation } from '@/types'

interface DashboardStats {
  totalEvaluations: number
  completedEvaluations: number
  pendingEvaluations: number
  averageScore: number | null
  totalUsers: number
  activeCycles: number
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'kbt-badge-neutral', IN_PROGRESS: 'kbt-badge-warning',
  SUBMITTED: 'kbt-badge-info', REVIEWED: 'kbt-badge-success', CLOSED: 'kbt-badge-neutral',
}
const STATUS_LBL: Record<string, string> = {
  DRAFT: 'Draft', IN_PROGRESS: 'In Progress', SUBMITTED: 'Submitted', REVIEWED: 'Reviewed', CLOSED: 'Closed',
}

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  })

  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
  })

  const recent = evaluations?.slice(0, 5) ?? []
  const completionPct = stats && stats.totalEvaluations > 0
    ? Math.round((stats.completedEvaluations / stats.totalEvaluations) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      {/* Welcome banner */}
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '20px 24px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #00c87a, #3b82f6)' }} />
        <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,200,122,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
              {greeting}
            </p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              {user?.name} <span style={{ background: 'linear-gradient(135deg,#00c87a,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>👋</span>
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: 4 }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(isAdmin || isManager) && (
              <Link to="/evaluations" style={{ textDecoration: 'none' }}>
                <button className="kbt-btn-primary" style={{ gap: 6 }}>
                  <Plus size={14} /> New Evaluation
                </button>
              </Link>
            )}
            <Link to="/reports" style={{ textDecoration: 'none' }}>
              <button className="kbt-btn-outline" style={{ gap: 6 }}>
                <BarChart2 size={14} /> View Reports
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          {
            label: 'Total Evaluations', value: stats?.totalEvaluations ?? '—',
            icon: <ClipboardList size={16} color="#3b82f6" />, color: '#3b82f6',
            sub: 'รอบปัจจุบัน', bg: 'rgba(59,130,246,0.08)',
          },
          {
            label: 'Completed', value: stats?.completedEvaluations ?? '—',
            icon: <CheckCircle2 size={16} color="#00c87a" />, color: '#00c87a',
            sub: `${completionPct}% completion rate`, bg: 'rgba(0,200,122,0.08)',
          },
          {
            label: 'Avg Score', value: stats?.averageScore != null ? stats.averageScore.toFixed(2) : '—',
            icon: <TrendingUp size={16} color="#f59e0b" />, color: '#f59e0b',
            sub: 'overall average', bg: 'rgba(245,158,11,0.08)', mono: true,
          },
          {
            label: 'Total Users', value: stats?.totalUsers ?? '—',
            icon: <Users size={16} color="#22d3ee" />, color: '#22d3ee',
            sub: `${stats?.activeCycles ?? 0} active cycles`, bg: 'rgba(34,211,238,0.08)',
          },
        ].map(({ label, value, icon, color, sub, bg, mono }) => (
          <div key={label} className="kbt-metric" style={{ background: bg, borderColor: `${color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </div>
            </div>
            <p style={{ fontSize: '1.875rem', fontWeight: 800, color, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: '0.6875rem', color: '#4b5563', marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {stats && stats.totalEvaluations > 0 && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Overall Completion Progress</p>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a', fontSize: '0.875rem' }}>{completionPct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionPct}%`, background: 'linear-gradient(90deg,#00c87a,#3b82f6)', borderRadius: 3, boxShadow: '0 0 12px rgba(0,200,122,0.4)', transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.6875rem', color: '#4b5563' }}>{stats.completedEvaluations} completed</span>
            <span style={{ fontSize: '0.6875rem', color: '#4b5563' }}>{stats.pendingEvaluations} pending</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Recent Evaluations */}
        <div className="kbt-card">
          <div className="kbt-card-header">
            <span className="kbt-card-title">Recent Evaluations</span>
            <Link to="/evaluations" style={{ textDecoration: 'none' }}>
              <button className="kbt-btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', gap: 4 }}>
                View All <ArrowUpRight size={11} />
              </button>
            </Link>
          </div>
          {!recent.length ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#4b5563', fontSize: '0.875rem' }}>
              No evaluations yet
            </div>
          ) : (
            <table className="kbt-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Cycle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(ev => (
                  <tr key={ev.id} onClick={() => window.location.href = `/evaluations/${ev.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: 'linear-gradient(135deg,rgba(0,200,122,0.2),rgba(59,130,246,0.2))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', fontWeight: 700, color: '#00c87a',
                        }}>
                          {ev.evaluatee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.8125rem' }}>{ev.evaluatee?.name}</p>
                          <p style={{ fontSize: '0.6875rem', color: '#4b5563' }}>{ev.evaluatee?.department}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>{ev.cycle?.name}</td>
                    <td style={{ color: '#4b5563', fontSize: '0.75rem' }}>{getTypeLabel(ev.type)}</td>
                    <td><span className={STATUS_CLS[ev.status] ?? 'kbt-badge-neutral'}>{STATUS_LBL[ev.status] ?? ev.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {ev.totalScore != null ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00c87a' }}>{ev.totalScore.toFixed(2)}</span>
                      ) : <span style={{ color: '#4b5563' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="kbt-card">
            <div className="kbt-card-header"><span className="kbt-card-title">Quick Actions</span></div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'View My Evaluations', icon: <ClipboardList size={14} />, to: '/evaluations', color: '#00c87a' },
                { label: 'Browse Templates',     icon: <RefreshCw size={14} />,     to: '/templates',   color: '#3b82f6' },
                { label: 'Evaluation Cycles',    icon: <RefreshCw size={14} />,     to: '/cycles',      color: '#f59e0b' },
                { label: 'View Reports',         icon: <BarChart2 size={14} />,      to: '/reports',     color: '#22d3ee' },
                ...(isAdmin ? [{ label: 'User Management', icon: <Users size={14} />, to: '/users', color: '#a855f7' }] : []),
              ].map(({ label, icon, to, color }) => (
                <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}0d`; (e.currentTarget as HTMLElement).style.borderColor = `${color}20` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                    <ArrowUpRight size={11} color="#4b5563" style={{ marginLeft: 'auto' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="kbt-card">
            <div className="kbt-card-header"><span className="kbt-card-title">System Status</span></div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'API Server',   status: 'Online', color: '#00c87a' },
                { label: 'Database',     status: 'Online', color: '#00c87a' },
                { label: 'Auth Service', status: 'Online', color: '#00c87a' },
              ].map(({ label, status, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'pulseGreen 2s ease infinite' }} />
                    <span style={{ fontSize: '0.6875rem', color, fontWeight: 600 }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGreen { 0%,100%{opacity:1}50%{opacity:.3} }
      `}</style>
    </div>
  )
}
