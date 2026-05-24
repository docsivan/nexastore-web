'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import ProductBadges from '@/components/products/ProductBadges'

interface Props {
  product: Product
  compact?: boolean
}

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
  'infection-control': {
    from: '#2563eb',
    to: '#1e40af',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="2" fill="none" />
        <path d="M14 20h12M20 14v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  'dental-supplies': {
    from: '#0d9488',
    to: '#0f766e',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <path d="M12 10c-2 0-4 2-4 5 0 4 2 7 4 10 1 2 2 4 4 4s3-2 4-4 2-2 4 0 3 4 4 4 3-2 4-4c2-3 4-6 4-10 0-3-2-5-4-5-2 0-3 1-4 2s-2 2-4 2-3-1-4-2-2-2-4-2z" stroke="white" strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
  ppe: {
    from: '#f97316',
    to: '#ea580c',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <path d="M20 6L8 12v8c0 7 5 13 12 15 7-2 12-8 12-15v-8L20 6z" stroke="white" strokeWidth="2" fill="none" />
        <path d="M14 20l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  diagnostics: {
    from: '#9333ea',
    to: '#7c3aed',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <circle cx="20" cy="20" r="10" stroke="white" strokeWidth="2" fill="none" />
        <path d="M20 14v6l4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  sterilization: {
    from: '#16a34a',
    to: '#15803d',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <rect x="10" y="12" width="20" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
        <path d="M15 12V9a5 5 0 0110 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="20" cy="20" r="3" stroke="white" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  'medical-devices': {
    from: '#475569',
    to: '#334155',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-12 h-12 opacity-80">
        <path d="M8 28h24M16 28V16l4-4 4 4v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="13" y="20" width="6" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
}

function CategoryPlaceholder({ category }: { category: string }) {
  const grad = CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS['medical-devices']
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
    >
      {grad.icon}
    </div>
  )
}

export default function ProductCard({ product }: Props) {
  const { addItem, isInCart } = useCartContext()
  const { showToast } = useToast()
  const inCart = isInCart(product.id)
  const isOutOfStock = !product.inStock || product.stock === 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    addItem(product, product.minOrderQty)
    showToast(`${product.name} added to cart`, 'success')
  }

  const handleSignal = () => {
    fetch('/api/nexa/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal_type: 'product_click',
        item_code: product.sku,
        session_id: (() => {
          if (typeof window === 'undefined') return undefined
          let sid = sessionStorage.getItem('_hsid')
          if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('_hsid', sid) }
          return sid
        })(),
      }),
    }).catch(() => {})
  }

  const hasImage = product.images && product.images.length > 0 && product.images[0] && !product.images[0].startsWith('gradient:')

  const stockDot = isOutOfStock
    ? 'bg-red-500'
    : product.stock <= 10
    ? 'bg-amber-500'
    : 'bg-green-500'

  const stockText = isOutOfStock
    ? 'Out of Stock'
    : product.stock <= 10
    ? `Only ${product.stock} left`
    : 'In Stock'

  const stockTextColor = isOutOfStock
    ? 'text-red-600'
    : product.stock <= 10
    ? 'text-amber-600'
    : 'text-green-600'

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={handleSignal}
      className={`group relative flex flex-col bg-white rounded-[4px] border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden${isOutOfStock ? ' opacity-60' : ''}`}
    >
      {/* Image area */}
      <div className="relative h-[240px] overflow-hidden bg-gray-50 flex-shrink-0">
        {hasImage ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <CategoryPlaceholder category={product.category} />
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          <ProductBadges
            discount_percent={product.discount_percent}
            is_new={!!product.tags?.includes('new')}
            is_best_seller={product.featured}
            stock_quantity={product.stock}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-0">
        {/* Brand */}
        <p className="text-xs text-gray-400 uppercase tracking-wide font-body">
          {product.brand}
        </p>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 mt-1 line-clamp-2 leading-snug font-heading">
          {product.name}
        </h3>

        {/* Pack size */}
        {product.unitSize && (
          <p className="text-xs text-gray-500 mt-1 font-body">{product.unitSize} / {product.unit}</p>
        )}

        {/* Price row */}
        <div className="mt-2">
          {product.discount_percent && product.discount_percent > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xs line-through text-gray-400 font-body">
                {product.list_price ? `OMR ${product.list_price.toFixed(3)}` : `OMR ${(product.price / (1 - (product.discount_percent ?? 0) / 100)).toFixed(3)}`}
              </span>
              <span className="text-base font-bold text-[#0D0D0D] font-heading">
                {formatPrice(product.price)}
              </span>
            </div>
          ) : (
            <span className="text-base font-bold text-[#0D0D0D] font-heading">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Stock indicator */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stockDot}`} />
          <span className={`text-xs font-body font-medium ${stockTextColor}`}>{stockText}</span>
        </div>
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        disabled={isOutOfStock}
        className={`mt-3 w-full py-2.5 text-sm font-semibold font-heading transition-colors duration-200 min-h-[44px] flex-shrink-0 ${
          isOutOfStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : inCart
            ? 'bg-[#F5A623] text-white'
            : 'bg-[#0D0D0D] hover:bg-[#002855] text-white'
        }`}
      >
        {isOutOfStock ? 'Out of Stock' : inCart ? 'In Cart' : 'Add to Cart'}
      </button>
    </Link>
  )
}
