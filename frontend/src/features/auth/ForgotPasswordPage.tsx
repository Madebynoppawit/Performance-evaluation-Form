import { useT } from '@/i18n/languageContext'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

/* Password resets are admin-initiated (no email delivery). Users contact an
   admin, who resets them to a temporary password; the user is then forced to
   set a new password on first login. */
export default function ForgotPasswordPage() {
  const t = useT()

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
          <p style={{ marginTop: 7, color: 'var(--kbt-text-3)', lineHeight: 1.55 }}>{t('cp.contactAdminDesc')}</p>
        </div>

        <div className="amw-login-form-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0' }}>
            <ShieldCheck size={20} color="var(--m-light-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: 'var(--kbt-text-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>{t('cp.contactAdminBody')}</p>
          </div>

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
