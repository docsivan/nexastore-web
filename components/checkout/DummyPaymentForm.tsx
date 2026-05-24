'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/formatters'

interface Props {
  orderId: string
  total:   number
}

export default function DummyPaymentForm({ orderId, total }: Props) {
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handlePay = async (simulate: 'success' | 'failure') => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payment/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order_id: orderId, simulate }),
      })

      const json = await res.json()

      if (json.success) {
        router.push(json.redirect)
      } else {
        setError('Payment was declined. Please try again or use a different card.')
        setLoading(false)
      }
    } catch {
      setError('Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Test mode banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-card px-4 py-3 mb-6 flex items-center gap-2">
        <span className="text-yellow-600 text-lg">🧪</span>
        <div>
          <p className="font-heading font-semibold text-yellow-800 text-sm">Test Payment Mode</p>
          <p className="font-body text-xs text-yellow-700">
            This is a dummy gateway. Real PayTabs integration coming soon.
          </p>
        </div>
      </div>

      <div className="card p-6">
        {/* Order reference */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <div>
            <p className="font-body text-xs text-slate-muted">Order Reference</p>
            <p className="font-heading font-bold text-primary">#{orderId}</p>
          </div>
          <div className="text-right">
            <p className="font-body text-xs text-slate-muted">Amount Due</p>
            <p className="font-heading font-bold text-2xl text-primary-dark">{formatPrice(total)}</p>
          </div>
        </div>

        {/* Card logos */}
        <div className="flex items-center gap-3 mb-5">
          <div className="px-3 py-1.5 border border-border rounded text-xs font-heading font-bold text-blue-700 bg-blue-50">VISA</div>
          <div className="px-3 py-1.5 border border-border rounded text-xs font-heading font-bold text-red-600 bg-red-50">MC</div>
          <div className="px-3 py-1.5 border border-border rounded text-xs font-heading font-bold text-green-700 bg-green-50">PayTabs</div>
          <span className="ml-auto">
            <svg className="w-5 h-5 text-slate-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
        </div>

        {/* Mock card form */}
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block font-body text-xs font-semibold text-slate mb-1.5">
              Card Number
            </label>
            <input
              type="text"
              defaultValue="4111 1111 1111 1111"
              readOnly
              className="input-field text-sm font-body tracking-widest bg-surface cursor-not-allowed"
            />
            <p className="mt-1 text-[10px] font-body text-slate-muted">Test card number — pre-filled</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-slate mb-1.5">Expiry Date</label>
              <input
                type="text"
                defaultValue="12/28"
                readOnly
                className="input-field text-sm bg-surface cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-slate mb-1.5">CVV</label>
              <input
                type="text"
                defaultValue="123"
                readOnly
                className="input-field text-sm bg-surface cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-slate mb-1.5">
              Cardholder Name
            </label>
            <input
              type="text"
              placeholder="Your name as on card"
              className="input-field text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-btn px-4 py-3 mb-4">
            <p className="font-body text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={() => handlePay('success')}
          disabled={loading}
          className="btn-accent w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-3"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing payment…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay {formatPrice(total)} — Confirm Order
            </>
          )}
        </button>

        {/* Simulate failure button for testing */}
        <button
          onClick={() => handlePay('failure')}
          disabled={loading}
          className="w-full py-2.5 text-xs font-body text-slate-muted hover:text-red-500 transition-colors border border-dashed border-border rounded-btn"
        >
          🧪 Simulate payment failure (for testing)
        </button>

        <p className="mt-4 text-center text-[11px] font-body text-slate-muted">
          🔒 Payments secured by PayTabs · PCI-DSS compliant
        </p>
      </div>
    </div>
  )
}
