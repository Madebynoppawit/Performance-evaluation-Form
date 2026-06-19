import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, KeyRound, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import { useT } from '@/i18n/languageContext'

const schema = z.object({
  employeeNo: z.string().trim().min(1, 'Employee number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm: z.string().min(1, 'Confirm password is required'),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const t = useT()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/forgot-password', data)
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      setError('root', { message: 'Could not verify your employee number and date of birth.' })
    }
  }

  return (
    <div className="amw-login" style={{ position: 'relative', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}><ThemeToggle /></div>
      <section className="amw-login-panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--brand-gradient)', color: '#fff',
          }}>
            <KeyRound size={22} />
          </div>
          <h2 style={{ marginTop: 18, fontSize: '1.5rem', fontWeight: 900 }}>{t('cp.forgotTitle')}</h2>
          <p style={{ marginTop: 7, color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>{t('cp.forgotDesc')}</p>
        </div>

        <div className="amw-login-form-card">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {errors.root && (
              <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                {errors.root.message}
              </div>
            )}

            <div>
              <label className="kbt-label kbt-label-required">Employee number</label>
              <div style={{ position: 'relative' }}>
                <UserRound size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('employeeNo')} className="kbt-input" style={{ paddingLeft: 36 }} autoComplete="username" autoFocus />
              </div>
              {errors.employeeNo && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.employeeNo.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">Date of birth</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('dateOfBirth')} type="date" className="kbt-input" style={{ paddingLeft: 36 }} autoComplete="bday" />
              </div>
              {errors.dateOfBirth && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.dateOfBirth.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">{t('cp.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('password')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                  placeholder={t('cp.passwordHint')} autoComplete="new-password" />
              </div>
              {errors.password && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <div>
              <label className="kbt-label kbt-label-required">{t('cp.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                <input {...register('confirm')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                  placeholder={t('cp.confirmHint')} autoComplete="new-password" />
              </div>
              {errors.confirm && <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="kbt-btn-primary"
              style={{ marginTop: 4, height: 46, fontSize: '0.9375rem', borderRadius: 9, width: '100%' }}>
              {isSubmitting ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Resetting...</>
              ) : (
                <>Reset password <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 18, color: 'var(--kbt-text-3)', textDecoration: 'none',
          }}>
            <ArrowLeft size={14} /> {t('cp.backToSignIn')}
          </Link>
        </div>
      </section>
    </div>
  )
}
