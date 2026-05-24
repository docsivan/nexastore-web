'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'

interface Props {
  product: Product
  quantity: number
}

export default function AddToCartButton({ product, quantity }: Props) {
  const { addItem, isInCart } = useCartContext()
  const { showToast } = useToast()
  const [justAdded, setJustAdded] = useState(false)
  const inCart = isInCart(product.id)

  const handleAdd = () => {
    addItem(product, quantity)
    showToast(`${product.name} added to cart`, 'success')
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAdd}
        disabled={!product.inStock}
        className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-btn font-heading font-semibold text-sm transition-all duration-200 ${
          justAdded
            ? 'bg-accent text-white'
            : 'bg-primary text-white hover:bg-primary-light active:bg-primary-dark'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {justAdded ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Added to Cart!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </>
        )}
      </button>
      {inCart && !justAdded && (
        <p className="text-center text-xs font-body text-accent-dark font-medium">
          ✓ Already in your cart
        </p>
      )}
    </div>
  )
}
