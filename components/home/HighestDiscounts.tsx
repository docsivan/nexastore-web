'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import ProductBadges from '@/components/products/ProductBadges'

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-72 bg-gray-100 animate-pulse rounded-card" />
      ))}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const { addItem, isInCart } = useCartContext()
  const { showToast } = useToast()
  const inCart = isInCart(product.id)

  const discountPct = (product as Product & { discount_percent?: number }).discount_percent ?? 0
  const originalPrice =
    discountPct > 0 ? Math.round((product.price / (1 - discountPct / 100)) * 1000) / 1000 : product.price
  const saving = Math.round((originalPrice - product.price) * 1000) / 1000

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product, 1)
    showToast(`${product.name} added to cart`, 'success')
  }

  return (
    <Link href={`/products/${product.id}`} className="card card-hover flex flex-col overflow-hidden">
      <div
        className="h-36 flex items-center justify-center text-white/20 text-4xl font-bold relative"
        style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #0056a8 100%)' }}
      >
        {product.name.slice(0, 2).toUpperCase()}
        {discountPct > 0 && (
          <div
            className="absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold font-body leading-tight text-center"
            style={{ background: '#D32F2F' }}
          >
            -{discountPct}%
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <ProductBadges discount_percent={discountPct} stock_quantity={product.stock} />
        <div>
          <p className="font-body text-[10px] text-accent-dark font-semibold uppercase">{product.brand}</p>
          <p className="font-heading font-semibold text-xs text-primary-dark leading-snug line-clamp-2 mt-0.5">
            {product.name}
          </p>
        </div>
        <div className="mt-auto pt-1.5 border-t border-border">
          <div className="flex items-end gap-1.5 mb-0.5">
            <p className="font-heading font-bold text-sm text-primary-dark">{formatPrice(product.price)}</p>
            {discountPct > 0 && (
              <p className="font-body text-[10px] text-slate-muted line-through">{formatPrice(originalPrice)}</p>
            )}
          </div>
          {saving > 0 && (
            <p className="font-body text-[10px] text-accent-dark font-medium">
              Save {formatPrice(saving)}
            </p>
          )}
          <div className="flex justify-end mt-1.5">
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
      </div>
    </Link>
  )
}

export default function HighestDiscounts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/homepage/highest-discounts')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-lg text-primary-dark">Biggest Discounts</h2>
        <Link href="/products" className="font-body text-xs text-primary hover:text-primary-light transition-colors">
          View all →
        </Link>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
