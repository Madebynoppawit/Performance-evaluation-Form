import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuthStore } from './authStore'
import type { User } from '@/types'

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.patch('/auth/me', { password: data.password })
      updateUser(res.data as User)
      navigate('/', { replace: true })
    } catch {
      setError('root', { message: 'Could not update password — try again.' })
    }
  }

  return (
    <div className="amw-login" style={{ position: 'relative', justifyContent: 'center' }}>
      <div className="kbt-orb" style={{ width: 420, height: 420, background: 'radial-gradient(circle, rgba(92,86,144,0.16), transparent 70%)', top: -100, left: '20%', animationDuration: '12s' }} />
      <div className="kbt-orb" style={{ width: 240, height: 240, background: 'radial-gradient(circle, rgba(229,35,33,0.1), transparent 70%)', bottom: '12%', right: '18%', animationDuration: '14s', animationDelay: '-5s' }} />

      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}>
        <ThemeToggle />
      </div>

      <section className="amw-login-panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand-gradient)', color: '#ffffff', boxShadow: '0 16px 32px rgba(92,86,144,0.28), var(--glow-blue)',
          }}>
            <KeyRound size={22} />
          </div>
          <h2 style={{ marginTop: 18, fontSize: '1.5rem', fontWeight: 900, color: 'var(--kbt-text)' }}>
            Set a new password
          </h2>
          <p style={{ marginTop: 7, fontSize: '0.875rem', color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>
            Welcome{user?.name ? `, ${user.name}` : ''}. For your security, please replace the shared initial password before continuing.
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
              <label className="kbt-label kbt-label-required">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('password')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                  placeholder="At least 8 chars, 1 uppercase, 1 number" autoComplete="new-password" autoFocus />
              </div>
              {errors.password && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('confirm')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                  placeholder="Re-enter new password" autoComplete="new-password" />
              </div>
              {errors.confirm && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="kbt-btn-primary"
              style={{ marginTop: 8, height: 46, fontSize: '0.9375rem', borderRadius: 9, width: '100%' }}>
              {isSubmitting ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : (
                <>Set password & continue <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="kbt-btn-ghost" style={{ marginTop: 14, width: '100%', height: 38, fontSize: '0.8125rem' }}>
            Sign out
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={13} /> This change is recorded in the audit log.
        </p>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
