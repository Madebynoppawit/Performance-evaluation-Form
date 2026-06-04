import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(10,110,209,0.1)',
          border: '1px solid rgba(10,110,209,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: 'var(--glow-blue)',
        }}>
          <Compass size={32} color="var(--sap-blue)" />
        </div>

        <p style={{
          fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--sap-blue)', marginBottom: 12,
        }}>
          404 · Page Not Found
        </p>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 950,
          color: 'var(--kbt-text)', lineHeight: 1, marginBottom: 16,
        }}>
          Off the map.
        </h1>
        <p style={{
          color: 'var(--kbt-text-3)', fontSize: '0.9rem',
          lineHeight: 1.65, marginBottom: 32,
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="kbt-btn-primary" style={{ height: 44, paddingInline: 24, fontSize: '0.9375rem' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  )
}
