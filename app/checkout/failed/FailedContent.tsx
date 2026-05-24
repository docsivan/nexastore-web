'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function FailedContent() {
  const searchParams = useSearchParams()
  const orderId      = searchParams.get('id') ?? ''
  const [timeLeft, setTimeLeft] = useState(3600)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')
  const hours   = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60

  const whatsappMsg = encodeURIComponent(
    `Hello NexaStore, I had a payment issue with order reference ${orderId}. Can you help me complete my order?`
  )

  return (
    <div className="container-page py-14 max-w-lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-2xl text-primary-dark mb-2">Payment Not Confirmed</h1>
        <p className="font-body text-slate-muted text-sm">
          Your order details have been saved. You can retry anytime within 24 hours.
        </p>
      </div>

      {orderId && (
        <div className="card p-4 text-center mb-6">
          <p className="font-body text-xs text-slate-muted uppercase tracking-widest mb-1">Saved order reference</p>
          <p className="font-heading font-bold text-xl text-primary tracking-wide">{orderId}</p>
        </div>
      )}

      <div className="card p-5 mb-5">
        <h2 className="font-heading font-semibold text-sm text-primary-dark mb-4 uppercase tracking-wide">What happens next</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
            <div>
              <p className="font-heading font-semibold text-sm text-primary-dark">Retry payment now</p>
              <p className="font-body text-xs text-slate-muted mt-0.5">Your cart and details are saved. Click below to try again immediately.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-heading font-semibold text-sm text-primary-dark">1-hour reminder</p>
                <span className="font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                  {pad(hours)}:{pad(minutes)}:{pad(seconds)}
                </span>
              </div>
              <p className="font-body text-xs text-slate-muted mt-0.5">A WhatsApp reminder will be sent to complete your order.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
            <div>
              <p className="font-heading font-semibold text-sm text-primary-dark">24-hour final reminder</p>
              <p className="font-body text-xs text-slate-muted mt-0.5">A final reminder is sent tomorrow if the order is still unpaid.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
            <div>
              <p className="font-heading font-semibold text-sm text-slate">Auto-cancelled after 24 hours</p>
              <p className="font-body text-xs text-slate-muted mt-0.5">If payment is not completed the order is cancelled and you can place a new one.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={orderId ? `/checkout/payment?id=${orderId}` : '/cart'}
          className="btn-primary w-full py-3.5 text-sm text-center flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Retry Payment
        </Link>
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 text-sm font-heading font-semibold text-center rounded-btn border border-border flex items-center justify-center gap-2 hover:bg-surface transition-colors"
        >
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Contact Us on WhatsApp
        </a>
        <Link href="/" className="text-center font-body text-sm text-slate-muted hover:text-primary transition-colors py-1">
          Return to store
        </Link>
      </div>
    </div>
  )
}
