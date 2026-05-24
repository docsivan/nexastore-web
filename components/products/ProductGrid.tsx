'use client'

import { useState, useMemo } from 'react'
import { Product, ProductCategory } from '@/lib/types'
import ProductCard from '@/components/products/ProductCard'
import FilterPanel, { FilterState, INITIAL_FILTERS } from '@/components/products/FilterPanel'
import { deriveProductBreadcrumb } from '@/components/products/CategoryTree'
import SortBar, { SmartSortOption } from '@/components/products/SortBar'
import RecentlyViewed from '@/components/products/RecentlyViewed'
import EmptyState from '@/components/ui/EmptyState'

interface Props {
  products: Product[]
  initialCategory?: ProductCategory | ''
  initialSearch?: string
}

function smartSort(products: Product[], sort: SmartSortOption): Product[] {
  const copy = [...products]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => Number(a.price) - Number(b.price))
    case 'price-desc':
      return copy.sort((a, b) => Number(b.price) - Number(a.price))
    case 'highest-discount':
      return copy.sort((a, b) => Number(b.discount_percent ?? 0) - Number(a.discount_percent ?? 0))
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'top-sellers':
      return copy.sort((a, b) => Number(b.stock) - Number(a.stock))
    case 'recommended':
    default:
      return copy.sort((a, b) => {
        const aScore = (a.featured ? 10 : 0) + Number(a.discount_percent ?? 0) * 0.5
        const bScore = (b.featured ? 10 : 0) + Number(b.discount_percent ?? 0) * 0.5
        return bScore - aScore
      })
  }
}

function matchesCategory(p: Product, filterCat: string): boolean {
  if (!filterCat) return true
  // Use the same breadcrumb derivation as CategoryTree so tree nodes always match
  const breadcrumb = deriveProductBreadcrumb(p)
  const norm = (s: string) => s.toLowerCase().trim()
  return norm(breadcrumb) === norm(filterCat) || norm(breadcrumb).startsWith(norm(filterCat) + ' >')
}

function applyFilters(products: Product[], filters: FilterState, search: string): Product[] {
  return products.filter((p) => {
    if (filters.category && !matchesCategory(p, filters.category)) return false
    if (filters.brand && p.brand !== filters.brand) return false
    if (Number(p.price) < filters.minPrice) return false
    if (filters.maxPrice < 100 && Number(p.price) > filters.maxPrice) return false
    if (filters.inStockOnly && !p.inStock) return false
    if (filters.hasDiscount && !(p.discount_percent && p.discount_percent > 0)) return false
    if (filters.fastDelivery && p.stock < 30) return false
    if (search) {
      const q = search.toLowerCase()
      const match =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
}

export default function ProductGrid({ products, initialCategory = '', initialSearch = '' }: Props) {
  const [sort, setSort] = useState<SmartSortOption>('recommended')
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    category: initialCategory ?? '',
  }))

  const filtered = useMemo(
    () => smartSort(applyFilters(products, filters, search), sort),
    [products, filters, search, sort]
  )

  return (
    <div className="container-page py-6">
      {/* Top bar: search + sort */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <input
            type="search"
            placeholder="Search products, brands, SKUs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-sm pl-10 w-full"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-slate">✕</button>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* FilterPanel — handles both desktop sidebar and mobile drawer */}
        <FilterPanel products={products} filters={filters} onChange={setFilters} />

        {/* Main grid */}
        <div className="flex-1 min-w-0">
          <SortBar value={sort} onChange={setSort} total={filtered.length} />

          {filtered.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No products found"
              description="Try adjusting your filters or search term"
              actionLabel="Clear Filters"
              onAction={() => { setFilters(INITIAL_FILTERS); setSearch('') }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((product) => (
                <div key={product.id} className="animate-fade-in">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecentlyViewed />
    </div>
  )
}
