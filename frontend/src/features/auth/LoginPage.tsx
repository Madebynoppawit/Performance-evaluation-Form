import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Hash, HelpCircle, Loader2, Lock, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuthStore } from './authStore'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your employee number or email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const DEMO_PASSWORD = 'P@ssw0rd!'
const DEMO_ACCOUNTS = [
  { label: 'Admin', hint: 'Manage users, reports, cycles', identifier: 'admin@amw-ems.com' },
  { label: 'Manager', hint: 'Review team evaluations', identifier: 'manager.eng@amw-ems.com' },
  { label: 'Employee', hint: 'Complete own review', identifier: 'officer1@amw-ems.com' },
] as const

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const locationState = (window.history.state?.usr ?? {}) as { passwordReset?: boolean }

  const { register, handleSubmit, setError, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.user, res.data.token)
      navigate('/')
    } catch {
      setError('root', { message: 'Incorrect employee number, email, or password' })
    }
  }

  function fillDemoAccount(identifier: string) {
    setValue('identifier', identifier, { shouldValidate: true, shouldDirty: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true, shouldDirty: true })
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
      <div className="kbt-orb" style={{ width: 520, height: 520, background: 'radial-gradient(circle, rgba(92,86,144,0.16), transparent 70%)', top: -120, left: '8%', animationDuration: '12s' }} />
      <div className="kbt-orb" style={{ width: 360, height: 360, background: 'radial-gradient(circle, rgba(46,42,94,0.18), transparent 70%)', bottom: '6%', left: '28%', animationDuration: '16s', animationDelay: '-6s' }} />
      <div className="kbt-orb" style={{ width: 240, height: 240, background: 'radial-gradient(circle, rgba(229,35,33,0.1), transparent 70%)', top: '30%', left: '48%', animationDuration: '10s', animationDelay: '-3s' }} />
      <div className="kbt-orb" style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(150,144,196,0.14), transparent 70%)', top: '60%', right: '4%', animationDuration: '14s', animationDelay: '-8s' }} />

      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}>
        <ThemeToggle />
      </div>

      <section className="amw-login-brand">
        <div style={{ position: 'relative' }}>
          <div className="amw-login-logo">
            <img src="/amw-logo.png" alt="AMW" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          <div className="amw-login-copy">
            <p className="amw-login-eyebrow">Performance Intelligence Suite</p>
            <h1 className="amw-login-title">
              Evaluation<br /><span className="kbt-gradient-text">command center.</span>
            </h1>
            <p className="amw-login-subtitle">
              Review cycles, competency scoring, salary controls, and performance visibility in one secure workspace.
            </p>
          </div>

          <div className="amw-status-grid">
            {[
              { value: '360', label: 'Review ready', color: 'var(--sap-blue)' },
              { value: '5.00', label: 'Score scale', color: 'var(--amw-red)' },
              { value: 'RBAC', label: 'Access guard', color: 'var(--m-light-blue)' },
            ].map((item, i) => (
              <div key={item.label} className={`amw-status-tile kbt-animate-up kbt-stagger-${i + 1}`} style={{ borderColor: 'rgba(92,86,144,0.18)', background: 'rgba(92,86,144,0.05)' }}>
                <strong style={{ color: item.color }}>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="amw-login-trust">
          <CheckCircle2 size={16} color="var(--m-light-blue)" />
          Secure internal performance workflow
        </div>
      </section>

      <section className="amw-login-panel">
        <div className="amw-login-panel-heading">
          <div className="amw-login-panel-icon">
            <ShieldCheck size={22} style={{ position: 'relative', zIndex: 1 }} />
          </div>
          <h2>
            Sign in to <span className="kbt-gradient-text">AMW Command</span>
          </h2>
          <p>Use your employee number or company email to continue.</p>
        </div>

        <div className="amw-login-form-card">
          <form onSubmit={handleSubmit(onSubmit)} className="amw-login-form">
            {locationState.passwordReset && (
              <div className="kbt-msg-success" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                Password updated successfully. Sign in with your new password.
              </div>
            )}
            {errors.root && (
              <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                <Lock size={14} style={{ flexShrink: 0 }} />
                {errors.root.message}
              </div>
            )}

            <div>
              <label className="kbt-label kbt-label-required">Employee No. or Email</label>
              <div style={{ position: 'relative' }}>
                <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input
                  {...register('identifier')}
                  type="text"
                  className="kbt-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="e.g. 1024 or admin@amw-ems.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.identifier && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.identifier.message}</p>}
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
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--kbt-text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HelpCircle size={12} /> Forgot password?
              </Link>
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

          <div className="amw-demo-login">
            <div className="amw-demo-login-header">
              <span>Demo sign-in</span>
              <code>{DEMO_PASSWORD}</code>
            </div>
            <div className="amw-demo-login-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  className="amw-demo-account"
                  onClick={() => fillDemoAccount(account.identifier)}
                >
                  <strong>{account.label}</strong>
                  <span>{account.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="amw-login-footer">
          © {new Date().getFullYear()} AMW · Performance Evaluation System
        </p>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
