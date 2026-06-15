import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Hash, KeyRound, Loader2, Lock, MailCheck, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'

const verifySchema = z.object({
  employeeNo: z.string().trim().min(1, 'Enter your employee number'),
  dateOfBirth: z.string().min(1, 'Enter your date of birth'),
})
type VerifyData = z.infer<typeof verifySchema>

const newPassSchema = z.object({
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type NewPassData = z.infer<typeof newPassSchema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const resetToken = new URLSearchParams(window.location.search).get('token')
  const [requestSent, setRequestSent] = useState(false)
  const verifyForm = useForm<VerifyData>({ resolver: zodResolver(verifySchema) })
  const passForm = useForm<NewPassData>({ resolver: zodResolver(newPassSchema) })

  async function onVerify(data: VerifyData) {
    try {
      await api.post('/auth/forgot-password', data)
      setRequestSent(true)
    } catch {
      verifyForm.setError('root', { message: 'Unable to process the request. Please try again.' })
    }
  }

  async function onReset(data: NewPassData) {
    try {
      await api.post('/auth/reset-password', { token: resetToken, password: data.password })
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      passForm.setError('root', { message: 'Reset link has expired or is invalid.' })
    }
  }

  const title = resetToken
    ? 'Set a new password'
    : requestSent
      ? 'Check your email'
      : 'Forgot your password?'

  return (
    <div className="amw-login" style={{ position: 'relative', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 5 }}><ThemeToggle /></div>
      <section className="amw-login-panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--brand-gradient)', color: '#fff',
          }}>
            {requestSent ? <MailCheck size={22} /> : <KeyRound size={22} />}
          </div>
          <h2 style={{ marginTop: 18, fontSize: '1.5rem', fontWeight: 900 }}>{title}</h2>
          <p style={{ marginTop: 7, color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>
            {resetToken
              ? 'Choose a strong password for your account.'
              : requestSent
                ? 'If the employee details match an account, a reset link has been sent to its registered email.'
                : 'Enter your employee details. We will send a short-lived reset link to your registered email.'}
          </p>
        </div>

        <div className="amw-login-form-card">
          {resetToken ? (
            <form onSubmit={passForm.handleSubmit(onReset)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {passForm.formState.errors.root && <div className="kbt-msg-error">{passForm.formState.errors.root.message}</div>}
              <label>
                <span className="kbt-label kbt-label-required">New Password</span>
                <input {...passForm.register('password')} type="password" className="kbt-input"
                  autoComplete="new-password" autoFocus placeholder="At least 8 chars, 1 uppercase, 1 number" />
                {passForm.formState.errors.password && <p className="kbt-msg-error">{passForm.formState.errors.password.message}</p>}
              </label>
              <label>
                <span className="kbt-label kbt-label-required">Confirm Password</span>
                <input {...passForm.register('confirm')} type="password" className="kbt-input" autoComplete="new-password" />
                {passForm.formState.errors.confirm && <p className="kbt-msg-error">{passForm.formState.errors.confirm.message}</p>}
              </label>
              <button type="submit" disabled={passForm.formState.isSubmitting} className="kbt-btn-primary">
                {passForm.formState.isSubmitting ? <Loader2 size={16} /> : <Lock size={16} />}
                Set password <ArrowRight size={16} />
              </button>
            </form>
          ) : requestSent ? (
            <button type="button" className="kbt-btn-primary" style={{ width: '100%' }} onClick={() => setRequestSent(false)}>
              Request another link
            </button>
          ) : (
            <form onSubmit={verifyForm.handleSubmit(onVerify)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {verifyForm.formState.errors.root && <div className="kbt-msg-error">{verifyForm.formState.errors.root.message}</div>}
              <label>
                <span className="kbt-label kbt-label-required">Employee Number</span>
                <div style={{ position: 'relative' }}>
                  <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input {...verifyForm.register('employeeNo')} className="kbt-input" style={{ paddingLeft: 36 }} autoFocus />
                </div>
                {verifyForm.formState.errors.employeeNo && <p className="kbt-msg-error">{verifyForm.formState.errors.employeeNo.message}</p>}
              </label>
              <label>
                <span className="kbt-label kbt-label-required">Date of Birth</span>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input {...verifyForm.register('dateOfBirth')} type="date" className="kbt-input" style={{ paddingLeft: 36 }} />
                </div>
                {verifyForm.formState.errors.dateOfBirth && <p className="kbt-msg-error">{verifyForm.formState.errors.dateOfBirth.message}</p>}
              </label>
              <button type="submit" disabled={verifyForm.formState.isSubmitting} className="kbt-btn-primary">
                {verifyForm.formState.isSubmitting ? <Loader2 size={16} /> : <ShieldCheck size={16} />}
                Send reset link <ArrowRight size={16} />
              </button>
            </form>
          )}

          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 14, color: 'var(--kbt-text-3)', textDecoration: 'none',
          }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </section>
    </div>
  )
}
