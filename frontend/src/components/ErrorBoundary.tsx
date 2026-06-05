import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportError } from '@/lib/monitoring'

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    reportError(error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--kbt-bg)',
          padding: 24,
        }}>
          <div style={{
            width: 'min(100%, 480px)',
            background: 'var(--kbt-card)',
            border: '1px solid rgba(237,28,36,0.22)',
            borderRadius: 18,
            padding: 36,
            textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), var(--glow-red)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(237,28,36,0.12)',
              border: '1px solid rgba(237,28,36,0.24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={24} color="#ed1c24" />
            </div>
            <h2 style={{ color: 'var(--kbt-text)', fontSize: '1.2rem', fontWeight: 900, marginBottom: 10 }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--kbt-text-3)', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: 24 }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="kbt-btn-primary"
              style={{ width: '100%', height: 42 }}
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
            >
              <RefreshCw size={15} /> Back to Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
