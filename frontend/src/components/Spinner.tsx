import { Loader2 } from 'lucide-react'

/** Inline loading spinner (uses the global `.amw-spin` keyframe). */
export default function Spinner({ size = 14 }: { size?: number }) {
  return <Loader2 size={size} className="amw-spin" aria-hidden="true" />
}
