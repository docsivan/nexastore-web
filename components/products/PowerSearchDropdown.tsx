'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { getStockLabel } from '@/lib/utils'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'

interface Props {
  results:     Product[]
  isSearching: boolean
  hasSearched: boolean
  isAI:        boolean
  onClose:     () => void
  query:       string
}

export default function PowerSearchDropdown({
  results, isSearching, hasSearched, isAI, onClose, query,
}: Props) {
  const { addItem, isInCart } = useCartContext()
  const { showToast }         = useToast()

  if (!hasSearched && !isSearching) return null

  return (
    <div className="absolute top-full mt-1 w-full bg-white rounded-card shadow-modal border border-border z-50 overflow-hidden animate-slide-up">

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary-50 border-b border-border">
        <div className="flex items-center gap-1.5">
          {isAI && (
            <span className="inline-flex items-center gap-1 text-[10px] font-heading font-semibold text-primary bg-primary text-white px-2 py-0.5 rounded-full">
              ✦ AI
            </span>
          )}
          <span className="text-[11px] font-body text-slate-muted">
            {isSearching ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
          </span>
        </div>
        {results.length > 0 && (
          <Link
            href={`/products?q=${encodeURIComponent(query)}`}
            onClick={onClose}
            className="text-[11px] font-body font-medium text-primary hover:text-primary-light transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="px-4 py-6 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-50 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-slate-muted font-body">Searching products…</span>
        </div>
      )}

      {/* No results */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-slate-muted font-body">No products found for &quot;{query}&quot;</p>
          <Link
            href="/products"
            onClick={onClose}
            className="text-xs text-primary font-body font-medium mt-1 block hover:underline"
          >
            Browse all products
          </Link>
        </div>
      )}

      {/* Results */}
      {!isSearching && results.slice(0, 6).map((product) => {
        const stock     = getStockLabel(product.stock)
        const inCart    = isInCart(product.id)
        const stockPct  = Math.min(100, (product.stock / 500) * 100)

        return (
          <div
            key={product.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors border-b border-border/50 last:border-0 group"
          >
            {/* Image */}
            <Link href={`/products/${product.id}`} onClick={onClose} className="flex-shrink-0">
              <div className="w-10 h-10 rounded border border-border bg-surface overflow-hidden relative">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-contain p-1"
                  sizes="40px"
                  unoptimized
                />
              </div>
            </Link>

            {/* Info */}
            <Link href={`/products/${product.id}`} onClick={onClose} className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm text-primary-dark line-clamp-1 group-hover:text-primary transition-colors">
                {product.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {/* SKU */}
                <span className="text-[10px] font-body text-slate-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                  {product.sku}
                </span>
                {/* Pack size */}
                {product.unitSize && (
                  <span className="text-[10px] font-body text-slate-muted">{product.unitSize}</span>
                )}
              </div>

              {/* Stock indicator */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      product.stock === 0 ? 'bg-red-400' :
                      product.stock < 20 ? 'bg-yellow-400' : 'bg-accent'
                    }`}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-body font-semibold ${stock.color}`}>
                  {product.stock > 0 ? `${product.stock.toLocaleString()} units` : 'Out of stock'}
                </span>
              </div>
            </Link>

            {/* Price + Quick-Add */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="font-heading font-bold text-sm text-primary-dark">
                {formatPrice(product.price)}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  addItem(product, 1)
                  showToast(`${product.name} added`, 'success')
                  onClose()
                }}
                disabled={!product.inStock}
                className={`text-[10px] font-heading font-semibold px-2.5 py-1 rounded transition-all ${
                  inCart
                    ? 'bg-accent text-white'
                    : 'bg-primary text-white hover:bg-primary-light'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {inCart ? '✓ In cart' : '+ Add'}
              </button>
            </div>
          </div>
        )
      })}

      {/* Quick Order CTA */}
      {results.length > 0 && (
        <div className="px-3 py-2 bg-surface border-t border-border flex items-center justify-between">
          <span className="text-[11px] font-body text-slate-muted">Need to order in bulk?</span>
          <Link
            href="/quick-order"
            onClick={onClose}
            className="text-[11px] font-heading font-semibold text-primary hover:text-primary-light transition-colors"
          >
            Open Quick-Order Grid →
          </Link>
        </div>
      )}
    </div>
  )
}
