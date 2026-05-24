'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartContext } from '@/context/CartContext'
import { clarityEvent } from '@/lib/clarity'
import { CheckoutFormData } from '@/lib/types'
import type { CustomerAddress } from '@/lib/customer-auth'
import { formatPrice } from '@/lib/formatters'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import AddressConfirm from '@/components/checkout/AddressConfirm'
import CartSummary from '@/components/cart/CartSummary'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/ToastNotification'

export default function CheckoutPage() {
  const { cart, clearCart }              = useCartContext()
  const { showToast }                    = useToast()
  const router                           = useRouter()
  const [loading, setLoading]            = useState(false)
  const [confirmedAddress, setConfirmedAddress] = useState<CustomerAddress | null>(null)

  useEffect(() => {
    clarityEvent('checkout_started', cart.total.toFixed(3))
  }, [])

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon="cart"
          title="Nothing to checkout"
          description="Add products to your cart first"
          actionLabel="Browse Products"
          actionHref="/products"
        />
      </div>
    )
  }

  const handleSubmit = async (data: CheckoutFormData) => {
    setLoading(true)
    const finalData: CheckoutFormData = confirmedAddress ? {
      ...data,
      address:     [confirmedAddress.building, confirmedAddress.street, confirmedAddress.area, confirmedAddress.wilayat].filter(Boolean).join(', ') || data.address,
      city:        confirmedAddress.area || confirmedAddress.wilayat || data.city,
      governorate: confirmedAddress.governorate || data.governorate,
    } : data
    try {
      // DEF-001 FIX — re-validate stock against live Airtable before creating order
      const validateRes = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((i) => ({
            productId: i.product.id,
            quantity:  i.quantity,
          })),
        }),
      })
      const validateJson = await validateRes.json()
      if (!validateRes.ok || !validateJson.valid) {
        const blocked = (validateJson.items || [])
          .filter((i: { valid: boolean; reason?: string; productId?: string }) => !i.valid)
          .map((i: { valid: boolean; reason?: string; productId?: string }) => i.reason || 'Item unavailable')
          .join(', ')
        showToast(
          blocked
            ? `Cannot complete order: ${blocked}. Please update your cart.`
            : 'Some items in your cart are no longer available. Please review your cart.',
          'error'
        )
        setLoading(false)
        return
      }

      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Customer / contact
          firstName: finalData.firstName,
          lastName:  finalData.lastName,
          email:     finalData.email,
          phone:     finalData.phone,
          company:   finalData.company ?? '',

          // Delivery
          address:     finalData.address,
          city:        finalData.city,
          governorate: finalData.governorate,
          notes:       finalData.notes ?? '',

          // Cart items (cart stores adapted Product objects — id = item_code)
          items: cart.items.map((i) => ({
            product: {
              id:    i.product.id,      // item_code
              name:  i.product.name,
              price: i.product.price,   // final_price
              unit:  i.product.unit,    // pack_size
            },
            quantity: i.quantity,
          })),

          // Totals
          subtotal: cart.subtotal,
          vat:      cart.vat,
          total:    cart.total,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Order creation failed')
      }

      router.push(`/checkout/payment?id=${json.order_id}&total=${cart.total}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      showToast(message, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-6 pb-14">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Cart', href: '/cart' },
          { label: 'Checkout' },
        ]}
      />

      <h1 className="font-heading font-bold text-2xl text-primary-dark mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 card p-6 space-y-6">
          {/* Delivery address confirmation */}
          <div>
            <h2 className="font-heading font-semibold text-base text-primary-dark mb-3">Delivery Address</h2>
            {confirmedAddress ? (
              <div className="bg-blue-50 border border-[#0D0D0D]/20 rounded-xl p-3 flex items-start justify-between">
                <p className="text-sm text-gray-700">
                  {[confirmedAddress.building, confirmedAddress.street, confirmedAddress.area, confirmedAddress.wilayat, confirmedAddress.governorate].filter(Boolean).join(', ')}
                </p>
                <button
                  onClick={() => setConfirmedAddress(null)}
                  className="text-xs text-primary font-medium hover:underline ml-3 flex-shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <AddressConfirm
                onConfirm={(a) => setConfirmedAddress(a)}
                onAddNew={() => router.push('/dashboard')}
              />
            )}
          </div>

          {/* Contact & order details form */}
          <CheckoutForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* Order summary sidebar */}
        <div className="flex flex-col gap-4">
          <CartSummary cart={cart} showCheckoutButton={false} />

          {/* Items quick view */}
          <div className="card p-4">
            <h3 className="font-heading font-semibold text-sm text-primary-dark mb-3">Order Items</h3>
            <div className="flex flex-col gap-2">
              {cart.items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between font-body text-xs text-slate">
                  <span className="line-clamp-1 flex-1">{product.name} ×{quantity}</span>
                  <span className="font-medium ml-2 flex-shrink-0">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
