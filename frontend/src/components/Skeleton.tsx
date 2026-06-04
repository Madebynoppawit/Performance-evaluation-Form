import type { CSSProperties } from 'react'

function Line({ width = '100%', height = 12, style }: { width?: string | number; height?: number; style?: CSSProperties }) {
  return <div className="kbt-skeleton" style={{ height, width, borderRadius: 4, ...style }} />
}

export function SkeletonMetricCard() {
  return (
    <div className="kbt-metric" style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
        <Line width="44%" height={9} />
        <div className="kbt-skeleton" style={{ width: 30, height: 30, borderRadius: 8 }} />
      </div>
      <Line width="34%" height={28} />
      <Line width="58%" height={9} style={{ marginTop: 8 }} />
    </div>
  )
}

export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '13px 16px' }}>
              <Line width={`${42 + ((i * 11 + j * 19) % 46)}%`} height={12} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="kbt-card kbt-animate-fade">
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--kbt-border)' }}>
        <Line width={180} height={13} />
      </div>
      <table className="kbt-table">
        <tbody><SkeletonTableRows rows={rows} cols={cols} /></tbody>
      </table>
    </div>
  )
}

export function SkeletonReport() {
  return (
    <div className="kbt-card kbt-animate-fade" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Line width={240} height={16} />
          <Line width={100} height={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <Line width={80} height={36} />
          <Line width={60} height={10} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[0, 1, 2].map(i => <SkeletonMetricCard key={i} />)}
      </div>
      <div style={{ height: 180, background: 'var(--control-bg)', borderRadius: 8 }} className="kbt-skeleton" />
    </div>
  )
}
