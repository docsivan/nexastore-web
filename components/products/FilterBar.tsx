'use client'

import { CATEGORIES } from '@/lib/mockData'
import { ProductCategory } from '@/lib/types'

interface Props {
  activeCategory?: ProductCategory | ''
  onCategoryChange: (cat: ProductCategory | '') => void
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  inStockOnly: boolean
  onInStockChange: (v: boolean) => void
  liveCounts?: Record<string, number>
}

export default function FilterBar({
  activeCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  inStockOnly,
  onInStockChange,
  liveCounts = {},
}: Props) {
  const totalLive = Object.values(liveCounts).reduce((a, b) => a + b, 0)

  return (
    <aside className="card p-5 sticky top-24 h-fit">
      <h3 className="font-heading font-semibold text-primary-dark text-sm mb-5">Filters</h3>

      {/* Categories */}
      <div className="mb-6">
        <p className="font-body text-xs text-slate-muted uppercase tracking-wider mb-3 font-semibold">Category</p>
        <div className="flex flex-col gap-1">
          {/* All Categories */}
          <button
            onClick={() => onCategoryChange('')}
            className={`flex items-center justify-between text-left px-3 py-1.5 rounded text-sm font-body transition-colors ${
              !activeCategory
                ? 'bg-primary text-white font-medium'
                : 'text-slate hover:bg-surface hover:text-primary'
            }`}
          >
            <span>All Categories</span>
            <span className={`text-xs ${!activeCategory ? 'text-white/70' : 'text-slate-muted'}`}>
              {totalLive > 0 ? totalLive : ''}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const count = liveCounts[cat.id] ?? 0
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center justify-between text-left px-3 py-1.5 rounded text-sm font-body transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary text-white font-medium'
                    : 'text-slate hover:bg-surface hover:text-primary'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                </span>
                <span className={`text-xs ${activeCategory === cat.id ? 'text-white/70' : 'text-slate-muted'}`}>
                  {count > 0 ? count : '–'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Price range */}
      <div className="mb-6">
        <p className="font-body text-xs text-slate-muted uppercase tracking-wider mb-3 font-semibold">Price Range (OMR)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={priceRange[0]}
            onChange={(e) => onPriceChange([+e.target.value, priceRange[1]])}
            className="input-field text-sm w-20"
            placeholder="Min"
          />
          <span className="text-slate-muted text-sm">–</span>
          <input
            type="number"
            min={0}
            value={priceRange[1]}
            onChange={(e) => onPriceChange([priceRange[0], +e.target.value])}
            className="input-field text-sm w-20"
            placeholder="Max"
          />
        </div>
      </div>

      {/* In stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            onClick={() => onInStockChange(!inStockOnly)}
            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
              inStockOnly ? 'bg-accent' : 'bg-slate-muted/30'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${inStockOnly ? 'translate-x-4' : ''}`} />
          </div>
          <span className="font-body text-sm text-slate group-hover:text-primary transition-colors">
            In Stock Only
          </span>
        </label>
      </div>
    </aside>
  )
}
