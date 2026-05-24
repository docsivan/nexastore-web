'use client'

interface ActiveFilters {
  inStockOnly:    boolean
  fastDelivery:   boolean
  volumeDiscount: boolean
}

interface Props {
  active:   ActiveFilters
  onChange: (filters: ActiveFilters) => void
  counts:   { inStockOnly: number; fastDelivery: number; volumeDiscount: number }
}

const CHIPS = [
  {
    key:   'inStockOnly' as const,
    label: 'In Stock Only',
    icon:  '✓',
    desc:  'Available now',
    color: 'accent',
  },
  {
    key:   'fastDelivery' as const,
    label: 'Fast Delivery',
    icon:  '',
    desc:  '50+ units ready',
    color: 'primary',
  },
  {
    key:   'volumeDiscount' as const,
    label: 'Volume Discount',
    icon:  '🏷',
    desc:  'Bulk savings available',
    color: 'yellow',
  },
]

export default function FilterChips({ active, onChange, counts }: Props) {
  const toggle = (key: keyof ActiveFilters) => {
    onChange({ ...active, [key]: !active[key] })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="font-body text-xs text-slate-muted font-medium hidden sm:block">Quick filters:</span>
      {CHIPS.map((chip) => {
        const isActive = active[chip.key]
        const count    = counts[chip.key]

        return (
          <button
            key={chip.key}
            onClick={() => toggle(chip.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-semibold border transition-all duration-150 ${
              isActive
                ? chip.color === 'accent'
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : chip.color === 'yellow'
                  ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                  : 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-slate border-border hover:border-primary-light hover:text-primary'
            }`}
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
            {count > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-heading font-bold ${
                isActive ? 'bg-white/20' : 'bg-surface border border-border text-slate-muted'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}

      {/* Clear all */}
      {(active.inStockOnly || active.fastDelivery || active.volumeDiscount) && (
        <button
          onClick={() => onChange({ inStockOnly: false, fastDelivery: false, volumeDiscount: false })}
          className="text-xs font-body text-slate-muted hover:text-red-500 transition-colors px-1"
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}
