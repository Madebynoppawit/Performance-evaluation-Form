import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Hash, Loader2, Lock, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuthStore } from './authStore'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your employee number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.user, res.data.token)
      navigate('/')
    } catch {
      setError('root', { message: 'Incorrect employee number or password' })
    }
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5))
    e.currentTarget.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5))
  }
  function onLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty('--mx', '0')
    e.currentTarget.style.setProperty('--my', '0')
  }

  return (
    <div className="amw-login" style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={onLeave}>
      {/* Ambient orbs */}
      <div className="kbt-orb" style={{ width: 520, height: 520, background: 'radial-gradient(circle, rgba(10,110,209,0.16), transparent 70%)', top: -120, left: '8%', animationDuration: '12s' }} />
      <div className="kbt-orb" style={{ width: 360, height: 360, background: 'radial-gradient(circle, rgba(22,88,142,0.18), transparent 70%)', bottom: '6%', left: '28%', animationDuration: '16s', animationDelay: '-6s' }} />
      <div className="kbt-orb" style={{ width: 240, height: 240, background: 'radial-gradient(circle, rgba(231,34,46,0.1), transparent 70%)', top: '30%', left: '48%', animationDuration: '10s', animationDelay: '-3s' }} />
      <div className="kbt-orb" style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(129,196,255,0.14), transparent 70%)', top: '60%', right: '4%', animationDuration: '14s', animationDelay: '-8s' }} />

      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}>
        <ThemeToggle />
      </div>

      <section className="amw-login-brand">
        <div style={{ position: 'relative' }}>
          <div className="amw-login-logo">
            <img src="/amw-logo.png" alt="AMW" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          <div style={{ marginTop: 48 }}>
            <p className="amw-login-eyebrow">Performance Intelligence Suite</p>
            <h1 className="amw-login-title">
              Evaluation<br /><span className="kbt-gradient-text">command center.</span>
            </h1>
            <p className="amw-login-subtitle">
              A focused control surface for review cycles, competency scoring, salary decisions, and organization-wide performance visibility.
            </p>
          </div>

          <div className="amw-status-grid">
            {[
              { value: '360°', label: 'Review ready', color: 'var(--sap-blue)' },
              { value: '5.00', label: 'Score scale', color: 'var(--amw-red)' },
              { value: 'RBAC', label: 'Access guard', color: 'var(--m-light-blue)' },
            ].map((item, i) => (
              <div key={item.label} className={`amw-status-tile kbt-animate-up kbt-stagger-${i + 1}`} style={{ borderColor: 'rgba(10,110,209,0.18)', background: 'rgba(10,110,209,0.05)' }}>
                <strong style={{ color: item.color }}>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--kbt-text-2)', fontSize: '0.8125rem', fontWeight: 700 }}>
          <CheckCircle2 size={16} color="var(--m-light-blue)" />
          Secure internal performance workflow
        </div>
      </section>

      <section className="amw-login-panel">
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--brand-gradient)',
            color: '#ffffff',
            boxShadow: '0 16px 32px rgba(10,110,209,0.28), var(--glow-blue)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <ShieldCheck size={22} style={{ position: 'relative', zIndex: 1 }} />
          </div>
          <h2 style={{ marginTop: 18, fontSize: '1.6rem', fontWeight: 900, color: 'var(--kbt-text)', letterSpacing: 0 }}>
            Sign in to <span className="kbt-gradient-text">AMW Command</span>
          </h2>
          <p style={{ marginTop: 7, fontSize: '0.875rem', color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>
            Sign in with your employee number to continue.
          </p>
        </div>

        <div className="amw-login-form-card">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errors.root && (
              <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                <Lock size={14} style={{ flexShrink: 0 }} />
                {errors.root.message}
              </div>
            )}

            <div>
              <label className="kbt-label kbt-label-required">Employee Number</label>
              <div style={{ position: 'relative' }}>
                <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input
                  {...register('identifier')}
                  type="text"
                  className="kbt-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="e.g. 1024"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.identifier && <p style={{ color: '#ed1c24', fontSize: '0.75rem', marginTop: 4 }}>{errors.identifier.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input
                  {...register('password')}
                  type="password"
                  className="kbt-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p style={{ color: '#ed1c24', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="kbt-btn-primary"
              style={{ marginTop: 8, height: 46, fontSize: '0.9375rem', borderRadius: 9, width: '100%' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  Enter Command
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--kbt-border)' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              Demo Access · admins sign in with email
            </p>
            {[
              { role: 'Admin', email: 'admin@amw-ems.com' },
              { role: 'Director', email: 'k.keng@amw-ems.com' },
              { role: 'Manager', email: 'manager.eng@amw-ems.com' },
              { role: 'Officer', email: 'officer1@amw-ems.com' },
            ].map(({ role, email }) => (
              <div key={email} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 8,
                marginBottom: 5,
                background: 'var(--control-bg)',
                border: '1px solid var(--kbt-border)',
              }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--m-light-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {role}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{email}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginTop: 8, textAlign: 'center' }}>
              Password: <span style={{ color: 'var(--kbt-text-2)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>P@ssw0rd!</span>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginTop: 18 }}>
          © {new Date().getFullYear()} AMW · Performance Evaluation System
        </p>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
