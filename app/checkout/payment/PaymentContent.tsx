'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import DummyPaymentForm from '@/components/checkout/DummyPaymentForm'

export default function PaymentContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')    ?? ''
  const total   = parseFloat(searchParams.get('total') ?? '0')
  const error   = searchParams.get('error')

  if (!orderId) {
    return (
      <div className="container-page py-14 text-center">
        <p className="font-body text-slate-muted mb-4">No order found.</p>
        <Link href="/cart" className="btn-primary text-sm">Back to Cart</Link>
      </div>
    )
  }

  return (
    <div className="container-page py-6 pb-14">
      <Breadcrumbs
        crumbs={[
          { label: 'Home',     href: '/' },
          { label: 'Cart',     href: '/cart' },
          { label: 'Checkout', href: '/checkout' },
          { label: 'Payment' },
        ]}
      />

      <h1 className="font-heading font-bold text-2xl text-primary-dark mb-2 mt-4">
        Complete Payment
      </h1>
      <p className="font-body text-sm text-slate-muted mb-8">
        Your order has been created. Complete payment to confirm.
      </p>

      {error === 'payment_failed' && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-card px-4 py-3">
            <p className="font-heading font-semibold text-red-700 text-sm">Payment Declined</p>
            <p className="font-body text-xs text-red-600 mt-0.5">
              Your payment was not processed. Please try again or contact us on WhatsApp.
            </p>
          </div>
        </div>
      )}

      <DummyPaymentForm orderId={orderId} total={total} />
    </div>
  )
}
