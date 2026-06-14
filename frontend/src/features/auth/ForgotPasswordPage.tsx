import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Hash, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'

// ── Step 1: verify identity ──────────────────────────────────────────────────
const verifySchema = z.object({
  employeeNo:  z.string().trim().min(1, 'Enter your employee number'),
  dateOfBirth: z.string().min(1, 'Enter your date of birth'),
})
type VerifyData = z.infer<typeof verifySchema>

// ── Step 2: set new password ─────────────────────────────────────────────────
const newPassSchema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type NewPassData = z.infer<typeof newPassSchema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'verify' | 'reset'>('verify')
  const [resetToken, setResetToken] = useState('')

  const verifyForm = useForm<VerifyData>({ resolver: zodResolver(verifySchema) })
  const passForm  = useForm<NewPassData>({ resolver: zodResolver(newPassSchema) })

  async function onVerify(data: VerifyData) {
    try {
      const res = await api.post('/auth/forgot-password', {
        employeeNo:  data.employeeNo,
        dateOfBirth: data.dateOfBirth,
      })
      setResetToken(res.data.resetToken)
      setStep('reset')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Employee number or date of birth is incorrect.'
      verifyForm.setError('root', { message: msg })
    }
  }

  async function onReset(data: NewPassData) {
    try {
      await api.post('/auth/reset-password', { token: resetToken, password: data.password })
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      passForm.setError('root', { message: 'Reset link has expired. Please start over.' })
    }
  }

  return (
    <div className="amw-login" style={{ position: 'relative', justifyContent: 'center' }}>
      <div className="kbt-orb" style={{ width: 440, height: 440, background: 'radial-gradient(circle, rgba(92,86,144,0.15), transparent 70%)', top: -100, left: '15%', animationDuration: '13s' }} />
      <div className="kbt-orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(229,35,33,0.09), transparent 70%)', bottom: '10%', right: '12%', animationDuration: '15s', animationDelay: '-6s' }} />

      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}>
        <ThemeToggle />
      </div>

      <section className="amw-login-panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand-gradient)', color: '#fff', boxShadow: '0 16px 32px rgba(92,86,144,0.28)',
          }}>
            <KeyRound size={22} />
          </div>
          <h2 style={{ marginTop: 18, fontSize: '1.5rem', fontWeight: 900, color: 'var(--kbt-text)' }}>
            {step === 'verify' ? 'Forgot your password?' : 'Set a new password'}
          </h2>
          <p style={{ marginTop: 7, fontSize: '0.875rem', color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>
            {step === 'verify'
              ? 'Enter your employee number and date of birth to verify your identity.'
              : 'Your identity has been verified. Set a new password below.'}
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            {(['verify', 'reset'] as const).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  background: step === s ? 'var(--amw-red)' : (i === 0 && step === 'reset') ? 'rgba(46,160,90,0.2)' : 'rgba(255,255,255,0.06)',
                  color: step === s ? '#fff' : (i === 0 && step === 'reset') ? '#2ea05a' : 'var(--kbt-text-3)',
                  border: `1.5px solid ${step === s ? 'var(--amw-red)' : (i === 0 && step === 'reset') ? 'rgba(46,160,90,0.5)' : 'var(--kbt-border)'}`,
                  transition: 'all 0.2s',
                }}>
                  {i === 0 && step === 'reset' ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.75rem', color: step === s ? 'var(--kbt-text)' : 'var(--kbt-text-3)', fontWeight: step === s ? 700 : 400 }}>
                  {s === 'verify' ? 'Verify Identity' : 'New Password'}
                </span>
                {i === 0 && <div style={{ width: 24, height: 1, background: 'var(--kbt-border)', marginLeft: 2 }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="amw-login-form-card">
          {step === 'verify' ? (
            <form onSubmit={verifyForm.handleSubmit(onVerify)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {verifyForm.formState.errors.root && (
                <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                  <Lock size={14} style={{ flexShrink: 0 }} />
                  {verifyForm.formState.errors.root.message}
                </div>
              )}

              <div>
                <label className="kbt-label kbt-label-required">Employee Number</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                  <input {...verifyForm.register('employeeNo')} type="text" className="kbt-input" style={{ paddingLeft: 36 }}
                    placeholder="e.g. 6415" autoComplete="username" autoFocus />
                </div>
                {verifyForm.formState.errors.employeeNo && (
                  <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{verifyForm.formState.errors.employeeNo.message}</p>
                )}
              </div>

              <div>
                <label className="kbt-label kbt-label-required">Date of Birth</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                  <input {...verifyForm.register('dateOfBirth')} type="date" className="kbt-input" style={{ paddingLeft: 36 }}
                    autoComplete="bday" />
                </div>
                {verifyForm.formState.errors.dateOfBirth && (
                  <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{verifyForm.formState.errors.dateOfBirth.message}</p>
                )}
              </div>

              <button type="submit" disabled={verifyForm.formState.isSubmitting} className="kbt-btn-primary"
                style={{ marginTop: 8, height: 46, fontSize: '0.9375rem', borderRadius: 9, width: '100%' }}>
                {verifyForm.formState.isSubmitting
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
                  : <>Verify Identity <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={passForm.handleSubmit(onReset)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {passForm.formState.errors.root && (
                <div className="kbt-msg-error" style={{ fontSize: '0.8125rem', padding: '10px 14px', borderRadius: 8 }}>
                  <Lock size={14} style={{ flexShrink: 0 }} />
                  {passForm.formState.errors.root.message}
                </div>
              )}

              <div>
                <label className="kbt-label kbt-label-required">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                  <input {...passForm.register('password')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                    placeholder="At least 8 chars, 1 uppercase, 1 number" autoComplete="new-password" autoFocus />
                </div>
                {passForm.formState.errors.password && (
                  <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{passForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="kbt-label kbt-label-required">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kbt-text-3)', pointerEvents: 'none' }} />
                  <input {...passForm.register('confirm')} type="password" className="kbt-input" style={{ paddingLeft: 36 }}
                    placeholder="Re-enter new password" autoComplete="new-password" />
                </div>
                {passForm.formState.errors.confirm && (
                  <p style={{ color: '#e52321', fontSize: '0.75rem', marginTop: 4 }}>{passForm.formState.errors.confirm.message}</p>
                )}
              </div>

              <button type="submit" disabled={passForm.formState.isSubmitting} className="kbt-btn-primary"
                style={{ marginTop: 8, height: 46, fontSize: '0.9375rem', borderRadius: 9, width: '100%' }}>
                {passForm.formState.isSubmitting
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <>Set password & sign in <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          <Link to="/login"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14,
              fontSize: '0.8125rem', color: 'var(--kbt-text-3)', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--kbt-text-3)', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={13} /> Recovery is verified against your employee record.
        </p>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
