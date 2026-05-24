'use client'

import { useCartContext } from '@/context/CartContext'
import CartItem from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'
import VolumeNudge from '@/components/cart/VolumeNudge'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import EmptyState from '@/components/ui/EmptyState'
import ReorderSidebar from '@/components/orders/ReorderSidebar'

export default function CartPage() {
  const { cart, clearCart } = useCartContext()

  return (
    <div className="container-page py-6 pb-14">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-primary-dark">
          Your Cart
          {cart.itemCount > 0 && (
            <span className="ml-2 font-body text-sm font-normal text-slate-muted">
              ({cart.itemCount} items)
            </span>
          )}
        </h1>
        {cart.itemCount > 0 && (
          <button
            onClick={clearCart}
            className="font-body text-sm text-slate-light hover:text-red-500 transition-colors"
          >
            Clear cart
          </button>
        )}
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Browse our healthcare products and add items to your cart"
          actionLabel="Shop Products"
          actionHref="/products"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="lg:col-span-2 card p-5">
            {cart.items.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))}
            <VolumeNudge items={cart.items} />
          </div>

          {/* Summary + Reorder sidebar */}
          <div className="flex flex-col gap-4">
            <CartSummary cart={cart} />
            <ReorderSidebar />
          </div>
        </div>
      )}
    </div>
  )
}
