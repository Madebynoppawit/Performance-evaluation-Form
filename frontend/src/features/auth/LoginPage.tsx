import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from './authStore'

const schema = z.object({
  email:    z.string().email('Invalid email address'),
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
      setError('root', { message: 'Incorrect email or password' })
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07090f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: 24,
    }}>
      {/* Animated background glows */}
      <div style={{
        position: 'fixed', width: 600, height: 600,
        borderRadius: '50%', top: '-20%', left: '-10%',
        background: 'radial-gradient(circle, rgba(0,200,122,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', width: 500, height: 500,
        borderRadius: '50%', bottom: '-15%', right: '-8%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Dot grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420, position: 'relative',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #00c87a, #3b82f6)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(0,200,122,0.3)',
            fontSize: '1rem', fontWeight: 800, color: '#000',
          }}>
            PE
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Performance Evaluation
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: 6 }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errors.root && (
              <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                <Lock size={14} style={{ flexShrink: 0 }} />
                {errors.root.message}
              </div>
            )}

            <div>
              <label className="kbt-label kbt-label-required">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#4b5563', pointerEvents: 'none',
                }} />
                <input
                  {...register('email')}
                  type="email"
                  className="kbt-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="user@company.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#4b5563', pointerEvents: 'none',
                }} />
                <input
                  {...register('password')}
                  type="password"
                  className="kbt-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="kbt-btn-primary"
              style={{ marginTop: 8, height: 44, fontSize: '0.9375rem', borderRadius: 8, width: '100%' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: '0.6875rem', color: '#4b5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Demo Accounts
            </p>
            {[
              { role: 'Admin', email: 'admin@company.com' },
              { role: 'Manager', email: 'manager.eng@company.com' },
              { role: 'Officer', email: 'officer1@company.com' },
            ].map(({ role, email }) => (
              <div key={email} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', borderRadius: 6, marginBottom: 4,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: '#00c87a',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {role}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'monospace' }}>{email}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.6875rem', color: '#4b5563', marginTop: 6, textAlign: 'center' }}>
              Password: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>P@ssw0rd!</span>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#4b5563', marginTop: 20 }}>
          © {new Date().getFullYear()} KBTG · Performance Evaluation System
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
