'use client'

export type SmartSortOption =
  | 'recommended'
  | 'top-sellers'
  | 'price-asc'
  | 'price-desc'
  | 'highest-discount'
  | 'newest'

const OPTIONS: { value: SmartSortOption; label: string }[] = [
  { value: 'recommended',      label: 'Recommended' },
  { value: 'top-sellers',      label: 'Top Sellers' },
  { value: 'price-asc',        label: 'Price: Low–High' },
  { value: 'price-desc',       label: 'Price: High–Low' },
  { value: 'highest-discount', label: 'Discount' },
  { value: 'newest',           label: 'Newest' },
]

interface Props {
  value: SmartSortOption
  onChange: (v: SmartSortOption) => void
  total: number
}

export default function SortBar({ value, onChange, total }: Props) {
  return (
    <div className="mb-5">
      {/* Count + label row */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-body text-sm text-slate-muted">
          <span className="font-semibold text-primary-dark">{total}</span> products
        </p>
        <p className="overline-label hidden sm:block">Sort</p>
      </div>

      {/* Pill row — horizontal scroll on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-body font-medium whitespace-nowrap transition-all duration-150 ${
              value === o.value
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-slate hover:border-primary/40 hover:text-primary'
            }`}
            style={{ borderRadius: '3px' }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
