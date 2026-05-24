'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/formatters'

interface Customer {
  record_id: string
  customer_id: string
  customer_name: string
  clinic_name: string
  phone: string
  email: string
  city: string
  total_orders: number
  total_spent: number
}

interface Props {
}

export default function CustomerLookup({}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(
        `/api/admin/orders?search=${encodeURIComponent(query)}`,
        { headers: {} }
      )
      if (!res.ok) { setResults([]); return }
      const data = await res.json()
      // Deduplicate customers from orders
      const seen = new Map<string, Customer>()
      for (const order of (data.orders ?? [])) {
        if (!seen.has(order.phone)) {
          seen.set(order.phone, {
            record_id:     order.record_id ?? '',
            customer_id:   '',
            customer_name: order.customer_name ?? '',
            clinic_name:   order.clinic_name ?? '',
            phone:         order.phone ?? '',
            email:         order.email ?? '',
            city:          order.city ?? '',
            total_orders:  0,
            total_spent:   0,
          })
        }
      }
      setResults(Array.from(seen.values()))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const waMsg = (name: string) =>
    encodeURIComponent(`Hello ${name}, this is NexaStore. How can we help you today?`)

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search by name, phone, or clinic…"
          className="input-field text-sm py-2 flex-1"
        />
        <button onClick={search} disabled={loading} className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="font-body text-sm text-slate-muted text-center py-8">No customers found</p>
      )}

      <div className="space-y-3">
        {results.map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-heading font-semibold text-sm text-primary-dark">{c.customer_name}</p>
                {c.clinic_name && <p className="font-body text-xs text-slate-muted">{c.clinic_name}</p>}
                <p className="font-body text-xs text-slate-muted">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
                {c.email && <p className="font-body text-xs text-slate-muted">{c.email}</p>}
              </div>
              <a
                href={`https://wa.me/${c.phone}?text=${waMsg(c.customer_name)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs font-body font-medium text-green-600 border border-green-200 px-3 py-1.5 rounded-btn hover:bg-green-50 transition-colors"
              >
                WhatsApp
              </a>
            </div>
            {(c.total_orders > 0 || c.total_spent > 0) && (
              <div className="mt-3 pt-3 border-t border-border flex gap-6">
                <div>
                  <p className="font-heading font-bold text-base text-primary">{c.total_orders}</p>
                  <p className="font-body text-[10px] text-slate-muted">Total Orders</p>
                </div>
                <div>
                  <p className="font-heading font-bold text-base text-primary">{formatPrice(c.total_spent)}</p>
                  <p className="font-body text-[10px] text-slate-muted">Total Spent</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
