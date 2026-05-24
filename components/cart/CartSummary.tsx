'use client'

import Link from 'next/link'
import { Cart } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import DeliveryProgressBar from '@/components/cart/DeliveryProgressBar'

interface Props {
  cart: Cart
  showCheckoutButton?: boolean
}

export default function CartSummary({ cart, showCheckoutButton = true }: Props) {
  return (
    <div className="card p-5 sticky top-24">
      <h3 className="font-heading font-semibold text-primary-dark text-base mb-4">Order Summary</h3>

      <div className="flex flex-col gap-3 pb-4 border-b border-border">
        <div className="flex justify-between font-body text-sm">
          <span className="text-slate">Subtotal ({cart.itemCount} items)</span>
          <span className="font-medium text-primary-dark">{formatPrice(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-slate">VAT (5%)</span>
          <span className="font-medium text-primary-dark">{formatPrice(cart.vat)}</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-slate">Delivery</span>
          <span className="text-accent-dark font-medium text-sm">
            {cart.subtotal >= 50 ? 'Free' : formatPrice(2.500)}
          </span>
        </div>
      </div>

      <div className="flex justify-between font-heading font-bold text-lg text-primary-dark pt-4 mb-5">
        <span>Total</span>
        <span>{formatPrice(cart.total + (cart.subtotal >= 50 ? 0 : 2.5))}</span>
      </div>

      <DeliveryProgressBar subtotal={cart.subtotal} />

      {showCheckoutButton && (
        <>
          <Link
            href="/checkout"
            className="btn-accent w-full text-center block text-sm"
          >
            Proceed to Checkout
          </Link>
          <Link
            href="/products"
            className="mt-2 text-center block font-body text-sm text-primary hover:text-primary-light transition-colors py-2"
          >
            ← Continue Shopping
          </Link>
        </>
      )}

      {/* Trust badges */}
      <div className="mt-5 pt-4 border-t border-border flex flex-col gap-1.5">
        {[
          '🔒 Secure PayTabs payment',
          'Same-day dispatch — orders before 1PM',
          '↩️ Easy returns within 14 days',
        ].map((text) => (
          <p key={text} className="font-body text-[11px] text-slate-muted">{text}</p>
        ))}
      </div>
    </div>
  )
}
