interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/* Accessible on/off switch. */
export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`amw-switch${checked ? ' on' : ''}`}
    >
      <span className="amw-switch-thumb" />
    </button>
  )
}
