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
import { useAuth } from '@/hooks/useAuth'

const roleLabel = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

const positionLabel = {
  DIRECTOR_UP: 'Director Up',
  MANAGER: 'Manager',
  OFFICER: 'Officer',
  SUPERVISOR: 'Supervisor',
  PRODUCTION_STAFF: 'Production Staff',
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
  if (user?.position === 'DIRECTOR_UP') return 'Director'
  return user?.role ? roleLabel[user.role] : '-'
}

export default function AccountPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageKey = useMemo(() => `amw-account-photo:${user?.id ?? 'guest'}`, [user?.id])
  const layoutStorageKey = useMemo(() => `amw-account-photo-layout:${user?.id ?? 'guest'}`, [user?.id])
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoLayout, setPhotoLayout] = useState<PhotoLayout>(defaultPhotoLayout)
  const [layoutOpen, setLayoutOpen] = useState(false)
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
    { label: 'Email', value: user?.email ?? '-', icon: Mail },
    { label: 'Department', value: user?.department ?? 'Not assigned', icon: Building2 },
    { label: 'Position', value: user?.position ? positionLabel[user.position] : 'Not assigned', icon: User },
    { label: 'Role', value: getDisplayRole(user), icon: ShieldCheck },
  ]

  const accessItems = [
    { label: 'Review Access', value: user?.role === 'EMPLOYEE' ? 'Self review only' : 'Team review workflow', icon: CheckCircle2 },
    { label: 'Legal Record', value: 'Audit trail enabled', icon: Scale },
    { label: 'Authentication', value: 'Company account active', icon: KeyRound },
    { label: 'Session Status', value: 'Protected workspace', icon: Fingerprint },
  ]

  return (
    <div className="kbt-page">
      <div className="kbt-page-header">
        <div>
          <span className="amw-eyebrow">Account Control</span>
          <h1>Account User</h1>
          <p>Manage identity, access level, notification preferences, and legal-tech account readiness.</p>
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
              {photo ? 'Change Photo' : 'Add Photo'}
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
                  Filter
                </button>
                <button type="button" onClick={removePhoto} className="danger">
                  <Trash2 size={14} />
                  Remove
                </button>
              </>
            )}
          </div>
          {photo && layoutOpen && (
            <div className="amw-photo-layout-panel">
              <div className="amw-photo-layout-title">
                <SlidersHorizontal size={14} />
                <span>Photo Layout</span>
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
          <span>Signed-in User</span>
          <h2>{user?.name ?? 'Unknown User'}</h2>
          <p>{user?.email ?? 'No email available'}</p>
          <div className="amw-account-tags">
            <strong>{getDisplayRole(user)}</strong>
            <strong>{user?.department ?? 'Unassigned department'}</strong>
            <strong>AMW-PEF Identity</strong>
          </div>
        </div>
        <div className="amw-account-seal" aria-label="Verified user identity seal">
          <User size={24} />
          <span>User Identity</span>
          <strong>Account Owner</strong>
          <em>Verified Person</em>
        </div>
      </section>

      <div className="amw-account-grid">
        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>Profile</span>
              <strong>User Information</strong>
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
              <span>Access</span>
              <strong>Security & Compliance</strong>
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
              <span>Preferences</span>
              <strong>Notification Channels</strong>
            </div>
          </div>
          <div className="amw-preference-list">
            {[
              { label: 'Evaluation reminders', detail: 'Before cycle deadlines and pending approvals', active: true },
              { label: 'Report availability', detail: 'When snapshots and summaries are refreshed', active: true },
              { label: 'Legal acknowledgement', detail: 'When signature or audit action is required', active: true },
            ].map(item => (
              <div key={item.label} className="amw-preference-item">
                <Bell size={16} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <em>{item.active ? 'On' : 'Off'}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="kbt-card amw-account-panel">
          <div className="amw-account-panel-head">
            <div>
              <span>Activity</span>
              <strong>Recent Account Events</strong>
            </div>
          </div>
          <div className="amw-timeline">
            {[
              { title: 'Account session verified', time: 'Now' },
              { title: 'Notification center synchronized', time: 'Today' },
              { title: 'Legal-tech access profile reviewed', time: 'This cycle' },
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
