'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import { getCustomerSession } from '@/lib/session'
import TopSellers from '@/components/home/TopSellers'

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-card" />
      ))}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
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
      <div
        className="h-36 flex items-center justify-center text-white/20 text-4xl font-bold"
        style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #0056a8 100%)' }}
      >
        {product.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div>
          <p className="font-body text-[10px] text-accent-dark font-semibold uppercase">{product.brand}</p>
          <p className="font-heading font-semibold text-xs text-primary-dark leading-snug line-clamp-2 mt-0.5">
            {product.name}
          </p>
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

export default function PersonalisedSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const session = getCustomerSession()
    if (!session) { setLoading(false); return }
    setIsLoggedIn(true)

    fetch(`/api/homepage/personalised?phone=${encodeURIComponent(session.phone)}`)
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!isLoggedIn) return <TopSellers />

  if (!loading && products.length === 0) return <TopSellers />

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-lg text-primary-dark">Recommended for You</h2>
          <span className="text-xs font-body text-white px-2 py-0.5 rounded-full" style={{ background: '#0D0D0D' }}>
            Personalised
          </span>
        </div>
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
