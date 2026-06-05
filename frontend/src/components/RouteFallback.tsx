import { Loader2 } from 'lucide-react'

/** Lightweight fallback shown while a lazy route chunk loads. */
export default function RouteFallback() {
  return (
    <div className="amw-route-fallback" role="status" aria-label="Loading">
      <Loader2 size={26} className="amw-spin" />
    </div>
  )
}
