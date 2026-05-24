'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/formatters'

interface StockItem {
  record_id: string
  item_code: string
  name: string
  brand: string
  category: string
  stock_quantity: number
  is_active: boolean
  final_price: number
}

interface Props {
}

export default function StockManagement({}: Props) {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stock', { headers: {} })
      .then(r => r.json())
      .then(d => setItems(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveStock = async (item: StockItem) => {
    const qty = editing[item.record_id] ?? item.stock_quantity
    setSaving(item.record_id)
    try {
      await fetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ record_id: item.record_id, stock_quantity: qty }),
      })
      setItems(prev => prev.map(i => i.record_id === item.record_id ? { ...i, stock_quantity: qty } : i))
      setEditing(prev => { const n = { ...prev }; delete n[item.record_id]; return n })
    } catch {} finally {
      setSaving(null)
    }
  }

  const toggleActive = async (item: StockItem) => {
    setSaving(item.record_id)
    try {
      await fetch('/api/admin/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ record_id: item.record_id, is_active: !item.is_active }),
      })
      setItems(prev => prev.map(i => i.record_id === item.record_id ? { ...i, is_active: !i.is_active } : i))
    } catch {} finally {
      setSaving(null)
    }
  }

  const filtered = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.name.toLowerCase().includes(q) || i.item_code.toLowerCase().includes(q)
  })

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />

  return (
    <div>
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or item code…"
        className="input-field text-sm py-2 w-full sm:w-72 mb-4"
      />
      <div className="space-y-2">
        {filtered.map(item => {
          const qty = editing[item.record_id] ?? item.stock_quantity
          const rowBg = item.stock_quantity === 0 ? 'border-red-300 bg-red-50' : item.stock_quantity < 10 ? 'border-amber-300 bg-amber-50' : 'border-border bg-white'
          return (
            <div key={item.record_id} className={`rounded-xl border ${rowBg} p-3 flex items-center gap-3 flex-wrap`}>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-primary-dark truncate">{item.name}</p>
                <p className="font-body text-xs text-slate-muted">{item.item_code} · {item.brand} · {formatPrice(item.final_price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number" min={0} value={qty}
                  onChange={e => setEditing(prev => ({ ...prev, [item.record_id]: parseInt(e.target.value) || 0 }))}
                  className="w-20 text-center border border-border rounded-btn px-2 py-1 text-sm font-body focus:border-primary outline-none"
                />
                {editing[item.record_id] !== undefined && (
                  <button
                    onClick={() => saveStock(item)}
                    disabled={saving === item.record_id}
                    className="text-xs px-2 py-1 bg-primary text-white rounded-btn hover:bg-primary-dark disabled:opacity-40"
                  >
                    {saving === item.record_id ? '…' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => toggleActive(item)}
                  disabled={saving === item.record_id}
                  className={`text-xs px-2 py-1 rounded-full font-body font-medium border transition-colors ${item.is_active ? 'bg-green-100 text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300' : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'}`}
                >
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
