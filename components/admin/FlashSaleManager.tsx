'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/formatters'

interface Product {
  record_id: string
  item_code: string
  name: string
  brand: string
  final_price: number
  discount_percent: number
}

interface Props {
}

export default function FlashSaleManager({}: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [activeSales, setActiveSales] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [discount, setDiscount] = useState('')
  const [saleStart, setSaleStart] = useState('')
  const [saleEnd, setSaleEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingActive, setLoadingActive] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stock', { headers: {} })
      .then(r => r.json())
      .then(d => {
        const sales = (d.products ?? []).filter((p: Product) => p.discount_percent > 0)
        setActiveSales(sales)
      })
      .catch(() => {})
      .finally(() => setLoadingActive(false))
  }, [])

  const doSearch = async () => {
    if (!search.trim()) return
    try {
      const res = await fetch('/api/admin/stock', { headers: {} })
      if (!res.ok) return
      const d = await res.json()
      const q = search.toLowerCase()
      setResults((d.products ?? []).filter((p: Product) =>
        p.name.toLowerCase().includes(q) || p.item_code.toLowerCase().includes(q)
      ).slice(0, 10))
    } catch {}
  }

  const applySale = async () => {
    if (!selected || !discount) return
    setSaving(true)
    try {
      await fetch('/api/admin/flash-sale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({
          record_id: selected.record_id,
          discount_percent: parseFloat(discount),
          sale_start: saleStart || null,
          sale_end: saleEnd || null,
        }),
      })
      setActiveSales(prev => {
        const filtered = prev.filter(p => p.record_id !== selected.record_id)
        return [...filtered, { ...selected, discount_percent: parseFloat(discount) }]
      })
      setSelected(null); setDiscount(''); setSaleStart(''); setSaleEnd('')
    } catch {} finally {
      setSaving(false)
    }
  }

  const cancelSale = async (product: Product) => {
    try {
      await fetch('/api/admin/flash-sale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ record_id: product.record_id, cancel: true }),
      })
      setActiveSales(prev => prev.filter(p => p.record_id !== product.record_id))
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Search + Set */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <h4 className="font-heading font-semibold text-sm text-primary-dark">Set Flash Sale</h4>
        <div className="flex gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search product by name or code…"
            className="input-field text-sm py-2 flex-1"
          />
          <button onClick={doSearch} className="btn-primary px-3 py-2 text-sm">Search</button>
        </div>

        {results.length > 0 && !selected && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map(p => (
              <button
                key={p.record_id}
                onClick={() => { setSelected(p); setResults([]) }}
                className="w-full text-left px-3 py-2 text-sm font-body hover:bg-surface rounded-btn transition-colors"
              >
                <span className="font-medium text-primary-dark">{p.name}</span>
                <span className="text-slate-muted ml-2 text-xs">{p.item_code} · {formatPrice(p.final_price)}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-btn">
              <p className="font-body text-sm text-primary-dark font-medium flex-1">{selected.name}</p>
              <button onClick={() => setSelected(null)} className="text-slate-muted hover:text-slate text-xs">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-body text-xs text-slate-muted mb-1">Discount %</label>
                <input type="number" min={1} max={99} value={discount} onChange={e => setDiscount(e.target.value)}
                  className="input-field w-full text-sm py-1.5" placeholder="e.g. 20" />
              </div>
              <div>
                <label className="block font-body text-xs text-slate-muted mb-1">Start (optional)</label>
                <input type="datetime-local" value={saleStart} onChange={e => setSaleStart(e.target.value)}
                  className="input-field w-full text-sm py-1.5" />
              </div>
              <div>
                <label className="block font-body text-xs text-slate-muted mb-1">End (optional)</label>
                <input type="datetime-local" value={saleEnd} onChange={e => setSaleEnd(e.target.value)}
                  className="input-field w-full text-sm py-1.5" />
              </div>
            </div>
            <button onClick={applySale} disabled={saving || !discount}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
              {saving ? 'Saving…' : 'Apply Flash Sale'}
            </button>
          </div>
        )}
      </div>

      {/* Active sales */}
      <div>
        <h4 className="font-heading font-semibold text-sm text-primary-dark mb-3">Active Sales</h4>
        {loadingActive && <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />}
        {!loadingActive && activeSales.length === 0 && (
          <p className="font-body text-sm text-slate-muted text-center py-6">No active flash sales</p>
        )}
        <div className="space-y-2">
          {activeSales.map(p => (
            <div key={p.record_id} className="bg-white rounded-xl border border-red-200 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-primary-dark">{p.name}</p>
                <p className="font-body text-xs text-slate-muted">{p.item_code} · {formatPrice(p.final_price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#D32F2F' }}>
                  {p.discount_percent}% OFF
                </span>
                <button onClick={() => cancelSale(p)}
                  className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded-btn hover:bg-red-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
