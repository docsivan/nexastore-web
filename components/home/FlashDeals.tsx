'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
      <span className="font-heading font-bold text-xs text-white/30 leading-none tracking-widest">
        {name.slice(0, 3).toUpperCase()}
      </span>
    </div>
  )
}


function Skeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-44 h-64 bg-gray-100 animate-pulse rounded-card" />
      ))}
    </div>
  )
}

function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const diff = Math.floor((midnight.getTime() - now.getTime()) / 1000)
      setTime({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

function pad(n: number) {
  return String(n).padStart(2, '0')
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
    <Link
      href={`/products/${product.id}`}
      className="flex-shrink-0 w-44 card card-hover flex flex-col overflow-hidden"
    >
      <div className="h-36 overflow-hidden flex-shrink-0 relative">
        {product.images && product.images[0] && !product.images[0].includes("placehold.co") ? (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <GradientPlaceholder category={product.category} name={product.name} />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <ProductBadges discount_percent={product.discount_percent} />
        <div className="mt-1">
          <p className="font-body text-[10px] text-accent-dark font-semibold uppercase">{product.brand}</p>
          <p className="font-heading font-semibold text-xs text-primary-dark leading-snug line-clamp-2 mt-0.5">
            {product.name}
          </p>
        </div>
        <div className="mt-auto pt-1.5 border-t border-border flex items-end justify-between gap-1">
          <div>
            <p className="font-heading font-bold text-sm text-primary-dark">
              {formatPrice(product.price)}
            </p>
            {product.discount_percent && product.discount_percent > 0 && product.list_price && (
              <p className="font-body text-[10px] text-slate-muted line-through">
                {formatPrice(product.list_price)}
              </p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className={`p-1.5 rounded-btn text-xs transition-all ${
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

export default function FlashDeals() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { h, m, s } = useCountdown()

  useEffect(() => {
    fetch('/api/homepage/flash-deals')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-heading font-bold text-xl text-primary-dark">Flash Deals</h2>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-body font-semibold"
            style={{ background: '#D32F2F' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {pad(h)}:{pad(m)}:{pad(s)}
          </div>
        </div>
        <Link href="/products" className="font-body text-xs text-primary hover:text-primary-light transition-colors">
          View all →
        </Link>
      </div>

      {loading ? (
        <Skeleton />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
