import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Clock4,
  Fingerprint,
  KeyRound,
  Mail,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n/languageContext'
import api from '@/lib/api'
import type { User as UserType } from '@/types'

const roleLabel = {
  DEVELOPER: 'Developer',
  ADMIN: 'Administrator',
  MANAGING_DIRECTOR: 'Managing Director',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Employee',
  STAFF: 'Staff',
  OPERATOR: 'Operator',
}

const positionLabel = {
  CEO: 'CEO',
  MANAGING_DIRECTOR: 'Managing Director',
  DIRECTOR_UP: 'Director',
  MANAGER: 'Manager',
  OFFICER: 'Officer',
  SUPERVISOR: 'Supervisor',
  PRODUCTION_STAFF: 'Production Staff',
  OTHER: 'Other',
}

type PhotoShape = 'rounded' | 'circle' | 'square'
type PhotoFit = 'cover' | 'contain'
type PhotoPosition = 'center' | 'top' | 'bottom'

interface PhotoLayout {
  shape: PhotoShape
  fit: PhotoFit
  position: PhotoPosition
}

const defaultPhotoLayout: PhotoLayout = {
  shape: 'rounded',
  fit: 'cover',
  position: 'center',
}

function getDisplayRole(user: ReturnType<typeof useAuth>['user']) {
  if (user?.position === 'CEO') return 'CEO'
  if (user?.position === 'MANAGING_DIRECTOR') return 'Managing Director'
  if (user?.position === 'DIRECTOR_UP') return 'Director'
  return user?.role ? roleLabel[user.role] : '-'
}

export default function AccountPage() {
  const { user, updateUser } = useAuth()
  const qc = useQueryClient()
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageKey = useMemo(() => `amw-account-photo:${user?.id ?? 'guest'}`, [user?.id])
  const layoutStorageKey = useMemo(() => `amw-account-photo-layout:${user?.id ?? 'guest'}`, [user?.id])
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoLayout, setPhotoLayout] = useState<PhotoLayout>(defaultPhotoLayout)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const profileKey = useMemo(() => `amw-account-profile:${user?.id ?? 'guest'}`, [user?.id])
  const [form, setForm] = useState({
    name: '', email: '', jobTitle: '',
    phone: '', bio: '', password: '', confirmPassword: '',
  })
  const [savedFlash, setSavedFlash] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const initials = user?.name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  useEffect(() => {
    setPhoto(localStorage.getItem(storageKey))
    const savedLayout = localStorage.getItem(layoutStorageKey)
    setPhotoLayout(savedLayout ? { ...defaultPhotoLayout, ...JSON.parse(savedLayout) } : defaultPhotoLayout)
  }, [storageKey, layoutStorageKey])

  useEffect(() => {
    const saved = localStorage.getItem(profileKey)
    const local = saved ? JSON.parse(saved) : {}
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      jobTitle: user?.jobTitle ?? '',
      phone: local.phone ?? '',
      bio: local.bio ?? '',
      password: '',
      confirmPassword: '',
    })
  }, [profileKey, user])

  async function saveDetails() {
    if (form.password && form.password !== form.confirmPassword) {
      setSaveError(t('acc.passwordMismatch'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        jobTitle: form.jobTitle.trim() || null,
      }
      if (form.password) payload.password = form.password
      const { data } = await api.patch<UserType>('/auth/me', payload)
      updateUser(data)
      // Keep the admin User Management list in sync with this self-edit.
      qc.invalidateQueries({ queryKey: ['users'] })
      localStorage.setItem(profileKey, JSON.stringify({ phone: form.phone, bio: form.bio }))
      setForm(f => ({ ...f, password: '', confirmPassword: '' }))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (err) {
      const res = (err as { response?: { data?: { message?: string; errors?: unknown } } }).response?.data
      setSaveError(typeof res?.message === 'string' ? res.message : t('acc.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  function updatePhotoLayout(next: Partial<PhotoLayout>) {
    const updated = { ...photoLayout, ...next }
    setPhotoLayout(updated)
    localStorage.setItem(layoutStorageKey, JSON.stringify(updated))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      setPhoto(result)
      if (result) localStorage.setItem(storageKey, result)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function removePhoto() {
    setPhoto(null)
    setLayoutOpen(false)
    localStorage.removeItem(storageKey)
  }

  const profileItems = [
    { label: t('acc.email'), value: user?.email ?? '-', icon: Mail },
    { label: t('acc.department'), value: user?.department ?? t('acc.notAssigned'), icon: Building2 },
    { label: t('acc.position'), value: user?.position ? positionLabel[user.position] : t('acc.notAssigned'), icon: User },
    { label: t('acc.role'), value: getDisplayRole(user), icon: ShieldCheck },
  ]

  const accessItems = [
    { label: t('acc.reviewAccess'), value: user?.role === 'EMPLOYEE' ? t('acc.selfOnly') : t('acc.teamWorkflow'), icon: CheckCircle2 },
    { label: t('acc.legalRecord'), value: t('acc.auditEnabled'), icon: Scale },
    { label: t('acc.authentication'), value: t('acc.companyActive'), icon: KeyRound },
    { label: t('acc.sessionStatus'), value: t('acc.protectedWorkspace'), icon: Fingerprint },
  ]

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">{t('page.account.eyebrow')}</span>
          <h1>{t('page.account.title')}</h1>
          <p>{t('page.account.desc')}</p>
        </div>
      </div>

      <section className="amw-account-hero">
        <div className="amw-account-photo-block">
          <button
            type="button"
            className={`amw-account-avatar shape-${photoLayout.shape}${photo ? ' has-photo' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            {photo ? (
              <img
                src={photo}
                alt={user?.name ?? 'Account user'}
                style={{
                  objectFit: photoLayout.fit,
                  objectPosition: photoLayout.position,
                }}
              />
            ) : initials}
            <span><Camera size={15} /></span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="amw-account-file"
          />
          <div className="amw-account-photo-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Camera size={14} />
              {photo ? t('acc.changePhoto') : t('acc.addPhoto')}
            </button>
            {photo && (
              <>
                <button
                  type="button"
                  onClick={() => setLayoutOpen(value => !value)}
                  className={layoutOpen ? 'active' : ''}
                  aria-expanded={layoutOpen}
                >
                  <SlidersHorizontal size={14} />
                  {t('acc.filter')}
                </button>
                <button type="button" onClick={removePhoto} className="danger">
                  <Trash2 size={14} />
                  {t('acc.remove')}
                </button>
              </>
            )}
          </div>
          {photo && layoutOpen && (
            <div className="amw-photo-layout-panel">
              <div className="amw-photo-layout-title">
                <SlidersHorizontal size={14} />
                <span>{t('acc.photoLayout')}</span>
              </div>
              <div className="amw-photo-layout-group" aria-label="Photo shape">
                {(['rounded', 'circle', 'square'] as PhotoShape[]).map(shape => (
                  <button
                    key={shape}
                    type="button"
                    className={photoLayout.shape === shape ? 'active' : ''}
                    onClick={() => updatePhotoLayout({ shape })}
                  >
                    {shape}
                  </button>
                ))}
              </div>
              <div className="amw-photo-layout-group" aria-label="Photo fit">
                {(['cover', 'contain'] as PhotoFit[]).map(fit => (
                  <button
                    key={fit}
                    type="button"
                    className={photoLayout.fit === fit ? 'active' : ''}
                    onClick={() => updatePhotoLayout({ fit })}
                  >
                    {fit}
                  </button>
                ))}
              </div>
              <div className="amw-photo-layout-group" aria-label="Photo position">
                {(['top', 'center', 'bottom'] as PhotoPosition[]).map(position => (
                  <button
                    key={position}
                    type="button"
                    className={photoLayout.position === position ? 'active' : ''}
                    onClick={() => updatePhotoLayout({ position })}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="amw-account-identity">
          <span>{t('acc.signedInUser')}</span>
          <h2>{user?.name ?? t('acc.unknownUser')}</h2>
          <p>{user?.email ?? '-'}</p>
          <div className="amw-account-tags">
            <strong>{getDisplayRole(user)}</strong>
            <strong>{user?.department ?? t('acc.notAssigned')}</strong>
            <strong>{t('acc.identity')}</strong>
          </div>
        </div>
        <div className="amw-account-seal" aria-label="Verified user identity seal">
          <User size={24} />
          <span>{t('acc.userIdentity')}</span>
          <strong>{t('acc.accountOwner')}</strong>
          <em>{t('acc.verifiedPerson')}</em>
        </div>
      </section>

      <section className="kbt-card amw-account-panel">
        <div className="amw-account-panel-head">
          <div>
            <span>{t('acc.editable')}</span>
            <strong>{t('acc.personalDetails')}</strong>
          </div>
          <button type="button" className="kbt-btn-primary" onClick={saveDetails} disabled={saving} style={{ height: 34 }}>
            {saving ? t('common.saving') : savedFlash ? <><CheckCircle2 size={14} /> {t('common.saved')}</> : t('common.saveChanges')}
          </button>
        </div>
        {saveError && (
          <div className="kbt-msg-error" style={{ margin: '0 0 12px', fontSize: '0.8125rem' }}>{saveError}</div>
        )}
        <div className="amw-account-edit-grid">
          <label className="amw-account-edit-field">
            <span className="kbt-label kbt-label-required">{t('acc.displayName')}</span>
            <input className="kbt-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={user?.name ?? ''} />
          </label>
          <label className="amw-account-edit-field">
            <span className="kbt-label kbt-label-required">{t('acc.email')}</span>
            <input className="kbt-input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={user?.email ?? ''} />
          </label>
          <label className="amw-account-edit-field">
            <span className="kbt-label">{t('acc.jobTitle')}</span>
            <input className="kbt-input" value={form.jobTitle}
              onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
              placeholder={t('acc.jobTitlePlaceholder')} />
          </label>
          <label className="amw-account-edit-field">
            <span className="kbt-label">{t('acc.contactNumber')}</span>
            <input className="kbt-input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+66 ..." />
          </label>
          <label className="amw-account-edit-field">
            <span className="kbt-label">{t('acc.newPassword')}</span>
            <input className="kbt-input" type="password" value={form.password} autoComplete="new-password"
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={t('acc.newPasswordHint')} />
          </label>
          <label className="amw-account-edit-field">
            <span className="kbt-label">{t('acc.confirmPassword')}</span>
            <input className="kbt-input" type="password" value={form.confirmPassword} autoComplete="new-password"
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder={t('acc.confirmPasswordHint')}
              style={form.confirmPassword && form.password !== form.confirmPassword ? { borderColor: 'var(--kbt-danger)' } : {}} />
          </label>
          <label className="amw-account-edit-field amw-account-edit-full">
            <span className="kbt-label">{t('acc.bioTitle')}</span>
            <textarea className="kbt-textarea" rows={2} value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={t('acc.bioPlaceholder')} />
          </label>
        </div>
        <p style={{ margin: '12px 2px 0', fontSize: '0.75rem', color: 'var(--kbt-text-3)' }}>{t('acc.roleManagedNote')}</p>
      </section>

      <div className="amw-account-grid">
        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>{t('acc.profile')}</span>
              <strong>{t('acc.userInfo')}</strong>
            </div>
          </div>
          <div className="amw-account-list">
            {profileItems.map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="amw-account-row">
                  <div className="amw-account-row-icon"><Icon size={16} /></div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              )
            })}
          </div>
        </section>

        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>{t('acc.accessGroup')}</span>
              <strong>{t('acc.securityCompliance')}</strong>
            </div>
          </div>
          <div className="amw-account-list">
            {accessItems.map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="amw-account-row">
                  <div className="amw-account-row-icon"><Icon size={16} /></div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="amw-account-grid">
        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>{t('nav.settings.sub')}</span>
              <strong>{t('acc.notifChannels')}</strong>
            </div>
          </div>
          <div className="amw-preference-list">
            {[
              { label: t('acc.notifEvalReminders'), detail: t('acc.notifEvalRemindersDesc'), active: true },
              { label: t('acc.notifReportAvail'), detail: t('acc.notifReportAvailDesc'), active: true },
              { label: t('acc.notifLegalAck'), detail: t('acc.notifLegalAckDesc'), active: true },
            ].map(item => (
              <div key={item.label} className="amw-preference-item">
                <Bell size={16} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <em>{item.active ? t('acc.on') : 'Off'}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>{t('acc.activity')}</span>
              <strong>{t('acc.recentEvents')}</strong>
            </div>
          </div>
          <div className="amw-timeline">
            {[
              { title: t('acc.eventVerified'), time: t('acc.eventNow') },
              { title: t('acc.eventSynced'), time: t('acc.eventToday') },
              { title: t('acc.eventReviewed'), time: t('acc.eventThisCycle') },
            ].map(item => (
              <div key={item.title} className="amw-timeline-item">
                <Clock4 size={15} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
