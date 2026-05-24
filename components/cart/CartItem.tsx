'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CartItem as CartItemType } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import QuantitySelector from '@/components/products/QuantitySelector'

interface Props {
  item: CartItemType
}

export default function CartItem({ item }: Props) {
  const { removeItem, updateQty } = useCartContext()
  const { product, quantity } = item

  return (
    <div className="flex items-start gap-4 py-5 border-b border-border last:border-0 animate-fade-in">
      {/* Image */}
      <Link href={`/products/${product.id}`} className="flex-shrink-0">
        <div className="w-20 h-20 rounded-card border border-border bg-surface overflow-hidden relative">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="80px"
            unoptimized
          />
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-body text-[10px] font-semibold text-accent-dark uppercase tracking-wider">{product.brand}</p>
            <Link href={`/products/${product.id}`}>
              <h4 className="font-heading font-semibold text-sm text-primary-dark hover:text-primary transition-colors line-clamp-2 mt-0.5">
                {product.name}
              </h4>
            </Link>
            {product.unitSize && (
              <p className="font-body text-[11px] text-slate-muted mt-0.5">{product.unitSize}</p>
            )}
          </div>
          <button
            onClick={() => removeItem(product.id)}
            className="text-slate-muted hover:text-red-500 transition-colors flex-shrink-0 p-1"
            aria-label="Remove item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <QuantitySelector
            value={quantity}
            min={product.minOrderQty}
            max={product.stock}
            onChange={(v) => updateQty(product.id, v)}
          />
          <div className="text-right">
            <p className="font-heading font-bold text-sm text-primary-dark">
              {formatPrice(product.price * quantity)}
            </p>
            <p className="font-body text-[11px] text-slate-muted">{formatPrice(product.price)} each</p>
          </div>
        </div>
      </div>
    </div>
  )
}
