'use client'

interface Props {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
}

export default function QuantitySelector({ value, min = 1, max = 99, onChange }: Props) {
  return (
    <div className="inline-flex items-center border border-border rounded-btn overflow-hidden">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="px-3 py-2 font-heading font-semibold text-primary hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="px-4 py-2 font-body font-semibold text-sm text-primary-dark min-w-[2.5rem] text-center border-x border-border">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="px-3 py-2 font-heading font-semibold text-primary hover:bg-primary-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
