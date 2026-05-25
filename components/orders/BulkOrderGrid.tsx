'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import { adaptAirtableProducts } from '@/lib/adapters'

function fuzzyScore(product: Product, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const fields = [
    { value: product.sku?.toLowerCase()      ?? '', weight: 10 },
    { value: product.id?.toLowerCase()       ?? '', weight: 10 },
    { value: product.name.toLowerCase(),           weight: 6  },
    { value: product.brand.toLowerCase(),          weight: 4  },
    { value: product.category.toLowerCase(),       weight: 2  },
    { value: product.unitSize?.toLowerCase() ?? '', weight: 1  },
  ]
  let score = 0
  for (const { value, weight } of fields) {
    if (!value) continue
    if (value === q)             { score += weight * 10; continue }
    if (value.startsWith(q))     { score += weight * 6;  continue }
    if (value.includes(q))       { score += weight * 3;  continue }
    const words = value.split(/[\s\-\/]+/)
    if (words.some((w) => w.startsWith(q))) { score += weight * 2; continue }
    if (words.some((w) => w.includes(q)))   { score += weight;     continue }
    let ci = 0
    for (const ch of q) { const idx = value.indexOf(ch, ci); if (idx !== -1) { ci = idx + 1; score += 0.2 } }
  }
  return score
}

function getFuzzyResults(products: Product[], query: string, limit = 6): Product[] {
  if (!query.trim()) return []
  return products
    .map((p) => ({ p, score: fuzzyScore(p, query) }))
    .filter(({ score }) => score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}

interface OrderRow {
  id:      string
  query:   string
  product: Product | null
  qty:     number
  results: Product[]
  open:    boolean
  error:   string
}

function newRow(id: string): OrderRow {
  return { id, query: '', product: null, qty: 1, results: [], open: false, error: '' }
}

let rowCounter = 0

export default function BulkOrderGrid() {
  const { addItem, cart } = useCartContext()
  const { showToast }     = useToast()
  const router            = useRouter()
  const [catalogue, setCatalogue] = useState<Product[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [rows, setRows] = useState<OrderRow[]>([
    newRow(`r${++rowCounter}`),
    newRow(`r${++rowCounter}`),
    newRow(`r${++rowCounter}`),
  ])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((json) => { if (json.data) setCatalogue(adaptAirtableProducts(json.data)) })
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [])

  const updateRow = (id: string, updates: Partial<OrderRow>) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r))

  const handleQueryChange = (id: string, value: string) => {
    const results = getFuzzyResults(catalogue, value)
    updateRow(id, { query: value, product: null, error: '', results, open: results.length > 0 && value.trim().length > 0 })
  }

  const handleSelect = (id: string, product: Product) => {
    updateRow(id, { query: product.name, product, results: [], open: false, error: '' })
    setTimeout(() => {
      const el = document.getElementById(`qty-${id}`) as HTMLInputElement
      el?.focus(); el?.select()
    }, 30)
  }

  const handleQueryBlur = (id: string) => {
    setTimeout(() => setRows((prev) => prev.map((r) => r.id === id ? { ...r, open: false } : r)), 160)
  }

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: 'query' | 'qty', rowId: string) => {
    const row = rows[rowIndex]
    if (e.key === 'Escape') { updateRow(rowId, { open: false }); return }
    if (e.key === 'Enter' && field === 'query' && row.open && row.results.length > 0) {
      e.preventDefault(); handleSelect(rowId, row.results[0]); return
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (field === 'query') {
        if (row.open && row.results.length > 0) { handleSelect(rowId, row.results[0]) }
        else { const q = document.getElementById(`qty-${rowId}`) as HTMLInputElement; q?.focus(); q?.select() }
      } else {
        if (rowIndex === rows.length - 1) {
          const newId = `r${++rowCounter}`
          setRows((prev) => [...prev, newRow(newId)])
          setTimeout(() => { (document.getElementById(`query-${newId}`) as HTMLInputElement)?.focus() }, 50)
        } else {
          (document.getElementById(`query-${rows[rowIndex + 1].id}`) as HTMLInputElement)?.focus()
        }
      }
    }
  }

  const addAll = () => {
    const valid = rows.filter((r) => r.product && r.qty > 0 && r.product.inStock)
    if (!valid.length) { showToast('No valid products to add', 'warning'); return }
    valid.forEach((r) => addItem(r.product!, r.qty))
    showToast(`${valid.length} product${valid.length !== 1 ? 's' : ''} added to cart`, 'success')
    router.push('/checkout')
  }

  const clearAll = () => {
    rowCounter += rows.length
    setRows([newRow(`r${++rowCounter}`), newRow(`r${++rowCounter}`), newRow(`r${++rowCounter}`)])
  }

  const removeRow = (id: string) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)) }

  const addRow = () => {
    const newId = `r${++rowCounter}`
    setRows((prev) => [...prev, newRow(newId)])
    setTimeout(() => (document.getElementById(`query-${newId}`) as HTMLInputElement)?.focus(), 50)
  }

  const subtotal   = rows.reduce((s, r) => s + (r.product ? parseFloat(String(r.product.price)) * r.qty : 0), 0)
  const validCount = rows.filter((r) => r.product?.inStock).length

  return (
    <div className="flex flex-col gap-4">

      <div className="bg-primary-50 border border-primary-100 rounded-[4px] px-4 py-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-[3px] bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
            <rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M8 17.5h8"/>
          </svg>
        </div>
        <div>
          <p className="font-heading font-semibold text-sm text-primary-dark">
            Fuzzy search — type anything
            {catLoading && <span className="ml-2 text-xs font-body text-slate-muted font-normal">Loading catalogue…</span>}
          </p>
          <p className="font-body text-xs text-slate-muted mt-0.5">
            Search by <strong>product name</strong>, <strong>brand</strong>, <strong>SKU</strong> or <strong>item code</strong>.
            Tab selects the first result and moves to quantity.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-2 px-4 py-2.5 bg-surface border-b border-border" style={{ gridTemplateColumns: '2fr 1fr 90px 90px 36px' }}>
          {['Product / SKU', 'Pack Size', 'Qty', 'Total', ''].map((h, i) => (
            <span key={i} className={`overline-label ${i >= 2 && i < 4 ? 'text-right' : ''}`}>{h}</span>
          ))}
        </div>

        <div className="divide-y divide-border">
          {rows.map((row, i) => (
            <div key={row.id} className={`grid gap-2 px-4 py-2.5 items-start transition-colors ${row.product ? 'bg-white' : 'bg-surface/40'}`} style={{ gridTemplateColumns: '2fr 1fr 90px 90px 36px' }}>

              <div className="relative">
                <div className="relative">
                  <input
                    id={`query-${row.id}`}
                    type="text"
                    value={row.query}
                    onChange={(e) => handleQueryChange(row.id, e.target.value)}
                    onBlur={() => handleQueryBlur(row.id)}
                    onFocus={() => { if (row.results.length > 0) updateRow(row.id, { open: true }) }}
                    onKeyDown={(e) => handleKeyDown(e, i, 'query', row.id)}
                    placeholder="Name, brand, SKU…"
                    autoComplete="off"
                    className={`w-full text-sm font-body border rounded-[3px] px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 transition-colors ${
                      row.error
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : row.product
                        ? 'border-accent/60 focus:border-accent focus:ring-accent/20 bg-accent-50'
                        : 'border-border focus:border-primary focus:ring-primary/20 bg-white'
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    {catLoading ? (
                      <div className="w-3 h-3 border border-primary-100 border-t-primary rounded-full animate-spin" />
                    ) : row.product ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-accent"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-muted"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    )}
                  </div>
                </div>

                {row.open && row.results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-border rounded-[3px] shadow-modal mt-0.5 overflow-hidden">
                    {row.results.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(row.id, p) }}
                        className={`w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors border-b border-border last:border-b-0 ${idx === 0 ? 'bg-primary-50/60' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-heading font-semibold text-primary-dark leading-snug truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="overline-label">{p.brand}</span>
                              <span className="overline-label text-primary/60">{p.sku || p.id}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-heading font-bold text-primary-dark">{formatPrice(p.price)}</p>
                            <p className={`text-[10px] font-body mt-0.5 ${p.inStock ? 'text-accent-dark' : 'text-red-500'}`}>
                              {p.inStock ? `${p.stock} in stock` : 'Out of stock'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="px-3 py-1.5 bg-surface border-t border-border">
                      <p className="overline-label">Tab or Enter to select first result</p>
                    </div>
                  </div>
                )}

                {row.product && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.product.inStock ? 'bg-accent' : 'bg-red-500'}`} />
                    <p className="text-[11px] font-body text-slate leading-snug truncate">{row.product.name}</p>
                    {!row.product.inStock && <span className="text-[10px] font-body text-red-500 font-semibold flex-shrink-0">Out of stock</span>}
                  </div>
                )}
                {row.error && <p className="text-[10px] font-body text-red-500 mt-0.5">{row.error}</p>}
                {!row.open && !row.product && row.query.trim().length > 1 && row.results.length === 0 && !catLoading && (
                  <p className="text-[10px] font-body text-slate-muted mt-0.5">No products match — try a different term</p>
                )}
              </div>

              <div className="text-xs font-body text-slate-muted pt-1.5">{row.product?.unitSize ?? '—'}</div>

              <div>
                <input
                  id={`qty-${row.id}`}
                  type="number"
                  min={1}
                  max={row.product?.stock ?? 999}
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                  onKeyDown={(e) => handleKeyDown(e, i, 'qty', row.id)}
                  onFocus={(e) => e.target.select()}
                  disabled={!row.product}
                  className="w-full text-sm font-body border border-border rounded-[3px] px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary/20 disabled:opacity-40 disabled:bg-surface"
                />
              </div>

              <div className="text-right pt-1.5">
                {row.product
                  ? <p className="text-sm font-heading font-bold text-primary-dark">{formatPrice(parseFloat(String(row.product.price)) * row.qty)}</p>
                  : <p className="text-sm text-slate-muted">—</p>
                }
              </div>

              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="mt-1.5 text-slate-muted hover:text-red-500 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Remove row"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border">
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-body font-medium text-primary hover:text-primary-light transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14"/></svg>
            Add row
          </button>
          <div className="flex items-center gap-4">
            {subtotal > 0 && (
              <div className="text-right">
                <p className="overline-label">Subtotal</p>
                <p className="font-heading font-bold text-base text-primary-dark">{formatPrice(subtotal)}</p>
              </div>
            )}
            <button onClick={clearAll} className="text-xs font-body text-slate-muted hover:text-red-500 transition-colors">Clear all</button>
            <button
              onClick={addAll}
              disabled={validCount === 0}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
              </svg>
              Add {validCount > 0 ? `${validCount} item${validCount !== 1 ? 's' : ''}` : 'to Cart'}
            </button>
          </div>
        </div>
      </div>

      {cart.itemCount > 0 && (
        <p className="font-body text-xs text-slate-muted text-center">
          {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''} already in cart ·{' '}
          <a href="/cart" className="text-primary hover:underline">View cart</a>
        </p>
      )}
    </div>
  )
}
