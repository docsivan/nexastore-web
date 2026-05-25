'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/lib/types'
import CategoryTree from './CategoryTree'

export interface FilterState {
  category: string       // breadcrumb path or category slug
  brand: string
  minPrice: number
  maxPrice: number
  inStockOnly: boolean
  hasDiscount: boolean
  fastDelivery: boolean
}

const INITIAL_FILTERS: FilterState = {
  category: '',
  brand: '',
  minPrice: 0,
  maxPrice: 100,
  inStockOnly: false,
  hasDiscount: false,
  fastDelivery: false,
}

function countActive(f: FilterState): number {
  let n = 0
  if (f.category)      n++
  if (f.brand)         n++
  if (f.minPrice > 0)  n++
  if (f.maxPrice < 100) n++
  if (f.inStockOnly)   n++
  if (f.hasDiscount)   n++
  if (f.fastDelivery)  n++
  return n
}

interface Props {
  products: Product[]
  filters: FilterState
  onChange: (f: FilterState) => void
}

function PanelContent({ products, filters, onChange }: Props) {
  const brands = useMemo(() => {
    const seen = new Set<string>()
    products.forEach((p) => { if (p.brand) seen.add(p.brand) })
    return Array.from(seen).sort()
  }, [products])

  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })

  return (
    <div className="space-y-5">
      {/* Category Tree */}
      <div>
        <h4 className="overline-label text-primary-dark mb-2 block">Category</h4>
        <CategoryTree products={products} selected={filters.category} onSelect={cat => set({ category: cat })} />
      </div>

      {/* Brand */}
      <div>
        <h4 className="overline-label text-primary-dark mb-2 block">Brand</h4>
        <select
          value={filters.brand}
          onChange={(e) => set({ brand: e.target.value })}
          className="w-full text-sm font-body border border-border rounded-btn px-2 py-1.5 bg-white focus:border-primary outline-none"
        >
          <option value="">All brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="overline-label text-primary-dark mb-2 block">Price Range</h4>
        <div className="space-y-2">
          <div className="flex justify-between font-body text-xs text-slate-muted">
            <span>${filters.minPrice.toFixed(2)}</span>
            <span>${filters.maxPrice.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0} max={100} step={0.001}
            value={filters.minPrice}
            onChange={(e) => set({ minPrice: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
          <input
            type="range" min={0} max={100} step={0.001}
            value={filters.maxPrice}
            onChange={(e) => set({ maxPrice: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* Toggles */}
      <div>
        <h4 className="overline-label text-primary-dark mb-2 block">Options</h4>
        <div className="space-y-2">
          {[
            { key: 'inStockOnly' as const,  label: 'In Stock Only' },
            { key: 'hasDiscount' as const,  label: 'Has Discount' },
            { key: 'fastDelivery' as const, label: 'Fast Delivery (30+ units)' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={(e) => set({ [key]: e.target.checked })}
                className="accent-primary"
              />
              <span className="font-body text-sm text-slate">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear All */}
      {countActive(filters) > 0 && (
        <button
          onClick={() => onChange(INITIAL_FILTERS)}
          className="w-full py-2 text-xs font-body font-semibold text-red-600 border border-red-200 rounded-btn hover:bg-red-50 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )
}

export { INITIAL_FILTERS, countActive }

export default function FilterPanel({ products, filters, onChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeCount = countActive(filters)

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden flex items-center gap-2 text-sm font-body font-medium border border-border rounded-btn px-3 py-2 bg-white hover:border-primary transition-colors"
        onClick={() => setMobileOpen(true)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto shadow-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-semibold text-sm text-primary-dark">Filters</h3>
              <button onClick={() => setMobileOpen(false)} className="text-slate-muted hover:text-slate p-1 rounded-[3px] hover:bg-surface transition-colors" aria-label="Close filters">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            </div>
            <PanelContent products={products} filters={filters} onChange={(f) => { onChange(f); }} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-52 flex-shrink-0">
        <div className="card p-4 sticky top-24">
          <h3 className="overline-label text-primary-dark mb-5 block">Filters</h3>
          <PanelContent products={products} filters={filters} onChange={onChange} />
        </div>
      </div>
    </>
  )
}
