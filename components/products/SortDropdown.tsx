import { SortOption } from '@/lib/types'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name A–Z' },
]

interface Props {
  value: SortOption
  onChange: (v: SortOption) => void
  total: number
}

export default function SortDropdown({ value, onChange, total }: Props) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-body text-sm text-slate-muted hidden sm:block">
        {total} product{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <label className="font-body text-xs text-slate-muted font-medium">Sort:</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          className="input-field text-sm py-1.5 w-44"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
