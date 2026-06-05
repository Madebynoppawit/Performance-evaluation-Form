import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; to: string }
  compact?: boolean
}

export default function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div className={`amw-empty${compact ? ' amw-empty--compact' : ''}`}>
      <div className="amw-empty-orb">
        <span className="amw-empty-ring" />
        <span className="amw-empty-ring amw-empty-ring--2" />
        <Icon size={compact ? 24 : 30} />
      </div>
      <strong>{title}</strong>
      <span className="amw-empty-desc">{description}</span>
      {action && (
        <Link to={action.to} className="kbt-btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
          {action.label} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}
