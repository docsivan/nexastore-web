'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import ProductBadges from '@/components/products/ProductBadges'

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  'infection-control': { from: '#2563eb', to: '#1e40af' },
  'dental-supplies':   { from: '#0d9488', to: '#0f766e' },
  'ppe':               { from: '#f97316', to: '#ea580c' },
  'diagnostics':       { from: '#9333ea', to: '#7c3aed' },
  'sterilization':     { from: '#16a34a', to: '#15803d' },
  'medical-devices':   { from: '#475569', to: '#334155' },
}
function GradientPlaceholder({ category, name }: { category: string; name: string }) {
  const g = CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS['medical-devices']
  return (
    <div
      className="w-full h-full flex items-end p-2"
      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
    >
      <span className="font-heading font-bold text-xs text-white/30 tracking-widest">
        {name.slice(0, 3).toUpperCase()}
      </span>
    </div>
  )
}


interface TopSellerItem {
  product: Product
  soldCount: number
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-card" />
      ))}
    </div>
  )
}

function ProductCard({ product, soldCount }: { product: Product; soldCount: number }) {
  const { addItem, isInCart } = useCartContext()
  const { showToast } = useToast()
  const inCart = isInCart(product.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product, 1)
    showToast(`${product.name} added to cart`, 'success')
  }

  return (
    <Link href={`/products/${product.id}`} className="card card-hover flex flex-col overflow-hidden">
      <div className="h-36 overflow-hidden flex-shrink-0">
        <GradientPlaceholder category={product.category} name={product.name} />
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <ProductBadges is_best_seller stock_quantity={product.stock} />
        <div>
          <p className="font-body text-[10px] text-accent-dark font-semibold uppercase">{product.brand}</p>
          <p className="font-heading font-semibold text-xs text-primary-dark leading-snug line-clamp-2 mt-0.5">
            {product.name}
          </p>
          {soldCount > 0 && (
            <p className="font-body text-[10px] text-slate-muted mt-0.5">{soldCount} sold</p>
          )}
        </div>
        <div className="mt-auto pt-1.5 border-t border-border flex items-center justify-between gap-1">
          <p className="font-heading font-bold text-sm text-primary-dark">{formatPrice(product.price)}</p>
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className={`p-1.5 rounded-btn transition-all ${
              inCart
                ? 'bg-accent text-white'
                : 'bg-primary-50 text-primary hover:bg-primary hover:text-white'
            } disabled:opacity-40`}
            aria-label="Add to cart"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={inCart ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'} />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  )
}

export default function TopSellers() {
  const [items, setItems] = useState<TopSellerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/homepage/top-sellers')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && items.length === 0) return null

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-xl text-primary-dark">Top Sellers</h2>
        <Link href="/products" className="font-body text-xs text-primary hover:text-primary-light transition-colors">
          View all →
        </Link>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map(({ product, soldCount }) => (
            <ProductCard key={product.id} product={product} soldCount={soldCount} />
          ))}
        </div>
      )}
    </section>
  )
}
