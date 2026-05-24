'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/formatters'

interface BriefingData {
  yesterday_orders: number
  yesterday_revenue: number
  pending_dispatch: number
  low_stock: { name: string; item_code: string; stock: number }[]
  top_products: { name: string; count: number }[]
}

interface Props {
}

export default function NexaBriefing({}: Props) {
  const [briefing, setBriefing] = useState('')
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchBriefing = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/briefing', { headers: {} })
      if (!res.ok) return
      const d = await res.json()
      setBriefing(d.briefing ?? '')
      setData(d.data)
      setFetched(true)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBriefing() }, [])

  const emailBriefing = async () => {
    const webhookUrl = '/api/whatsapp/message'
    setEmailSending(true)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'briefing', briefing }),
      })
    } catch {} finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />)}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Yesterday's Orders", value: data.yesterday_orders, color: 'text-primary' },
            { label: "Yesterday's Revenue", value: formatPrice(data.yesterday_revenue), color: 'text-green-600' },
            { label: 'Pending Dispatch', value: data.pending_dispatch, color: 'text-amber-600' },
            { label: 'Low Stock Items', value: data.low_stock.length, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[4px] border border-border p-3 text-center shadow-sm">
              <p className={`font-heading font-bold text-lg ${s.color}`}>{s.value}</p>
              <p className="font-body text-[10px] text-slate-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && briefing && (
        <div className="bg-white rounded-[4px] border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-[3px] bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
              <path d="M12 2L4 6v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V6l-8-4z"/><path d="M12 8v4M10 10h4"/>
            </svg>
          </div>
            <p className="font-heading font-semibold text-sm text-primary-dark">Haya&apos;s Morning Briefing</p>
          </div>
          <p className="font-body text-sm text-slate leading-relaxed whitespace-pre-line">{briefing}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={fetchBriefing} className="text-xs font-body text-slate-muted hover:text-primary transition-colors border border-border px-3 py-1.5 rounded-btn">
              ↻ Refresh
            </button>
            <button onClick={emailBriefing} disabled={emailSending}
              className="text-xs font-body font-medium bg-primary-50 text-primary px-3 py-1.5 rounded-btn hover:bg-primary hover:text-white transition-colors disabled:opacity-40">
              {emailSending ? 'Sending…' : 'Send Briefing'}
            </button>
          </div>
        </div>
      )}

      {!loading && !fetched && (
        <button onClick={fetchBriefing} className="btn-primary text-sm px-4 py-2">
          Generate Briefing
        </button>
      )}
    </div>
  )
}
