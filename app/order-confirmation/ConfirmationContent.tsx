'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import SmartWhatsAppButton from '@/components/order/SmartWhatsAppButton'
import { useCartContext } from '@/context/CartContext'
import { saveToReorderList } from '@/components/orders/ReorderSidebar'

const DELIVERY_STEPS = [
  { key: 'confirmed',  label: 'Order confirmed' },
  { key: 'processing', label: 'Being packed'    },
  { key: 'dispatched', label: 'Dispatched'      },
  { key: 'delivered',  label: 'Delivered'       },
]

function DeliveryTracker() {
  return (
    <div className="card p-5 mb-6">
      <h2 className="font-heading font-semibold text-sm text-primary-dark mb-5 uppercase tracking-wide">
        Delivery Status
      </h2>
      <div className="relative flex justify-between items-start">
        <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-border mx-7">
          <div className="h-full bg-accent w-0 transition-all duration-700" />
        </div>
        {DELIVERY_STEPS.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
              ${i === 0 ? 'bg-accent border-accent text-white' : 'bg-white border-border text-slate-muted'}`}>
              {i === 0 ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] font-body text-center w-16 leading-tight
              ${i === 0 ? 'text-primary-dark font-semibold' : 'text-slate-muted'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 bg-blue-50 border border-blue-100 rounded-btn px-3 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p className="font-body text-xs text-primary">
          Estimated delivery: <strong>3 business days</strong>. You will receive a WhatsApp update when dispatched.
        </p>
      </div>
    </div>
  )
}


const STEP_ICONS: Record<string, React.ReactNode> = {
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
}

export default function ConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId      = searchParams.get('id') ?? '000000'
  const { clearCart, cart } = useCartContext()

  useEffect(() => {
    const orderedProducts = cart.items.map((i) => i.product)
    if (orderedProducts.length > 0) saveToReorderList(orderedProducts)
    localStorage.setItem('nexa_order_just_placed', Date.now().toString())
    clearCart()
  }, [])

  return (
    <div className="container-page py-14 max-w-2xl">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-accent-50 border-2 border-accent flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-2xl text-primary-dark mb-2">Order Confirmed!</h1>
        <p className="font-body text-slate-muted text-sm">
          Your order has been placed and payment confirmed.
        </p>
      </div>

      <div className="card p-6 text-center mb-6 bg-primary-dark text-white">
        <p className="font-body text-xs text-blue-200 uppercase tracking-widest mb-1">Order Reference</p>
        <p className="font-heading font-bold text-3xl tracking-wide">{orderId}</p>
        <p className="font-body text-xs text-blue-200 mt-2">Keep this reference for your records and tracking.</p>
      </div>

      <DeliveryTracker />

      <div className="card p-5 mb-6">
        <h2 className="font-heading font-semibold text-sm text-primary-dark mb-4 uppercase tracking-wide">What happens next?</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: 'box', title: 'Order Processing',  desc: 'Our team will pick and pack your order within 2 business hours.' },
            { icon: '🚚', title: 'Dispatch',           desc: 'Orders are dispatched promptly after confirmation.' },
            { icon: 'chat', title: 'WhatsApp Update',    desc: 'You will receive a WhatsApp message with tracking details when dispatched.' },
          ].map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{STEP_ICONS[step.icon] ?? step.icon}</span>
              <div>
                <p className="font-heading font-semibold text-sm text-primary-dark">{step.title}</p>
                <p className="font-body text-xs text-slate-muted mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SmartWhatsAppButton context={{ type: 'order', orderId }} />
        <Link href="/products" className="btn-outline text-sm text-center">Continue Shopping</Link>
      </div>
    </div>
  )
}
