'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'

const STORAGE_KEY = 'hayat_reorder_items'

export function saveToReorderList(products: Product[]) {
  try {
    const existing: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    const merged = [
      ...products,
      ...existing.filter((e) => !products.some((p) => p.id === e.id)),
    ].slice(0, 8)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {}
}

export default function ReorderSidebar() {
  const { addItem, cart }       = useCartContext()
  const { showToast }           = useToast()
  const [items,    setItems]    = useState<Product[]>([])
  const [expanded, setExpanded] = useState(true)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      setItems(stored)
    } catch {}
  }, [])

  if (!mounted || items.length === 0) return null

  const restockAll = () => {
    const toAdd = items.filter((p) => p.inStock)
    if (toAdd.length === 0) { showToast('All items are out of stock', 'warning'); return }
    toAdd.forEach((p) => addItem(p, p.minOrderQty || 1))
    showToast(`${toAdd.length} items added to cart`, 'success')
  }

  const inCartIds = new Set(cart.items.map((i) => i.product.id))

  return (
    <div className="card overflow-hidden border-2 border-primary-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-b border-primary-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔁</span>
          <div>
            <p className="font-heading font-semibold text-sm text-primary-dark">Quick Reorder</p>
            <p className="font-body text-[10px] text-slate-muted">{items.length} previously ordered</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="text-slate-muted hover:text-primary transition-colors w-6 h-6 flex items-center justify-center rounded">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <>
          <div className="divide-y divide-border">
            {items.map((product) => (
              <div key={product.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors">
                <Link href={`/products/${product.id}`} className="flex-shrink-0">
                  <div className="w-10 h-10 rounded border border-border bg-surface overflow-hidden relative">
                    <Image src={product.images[0]} alt={product.name} fill
                      className="object-contain p-1" sizes="40px" unoptimized />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs font-medium text-primary-dark line-clamp-1">{product.name}</p>
                  <p className="font-body text-[10px] text-slate-muted">{formatPrice(product.price)}</p>
                </div>
                <button
                  onClick={() => { addItem(product, product.minOrderQty || 1); showToast(`${product.name} added`, 'success') }}
                  disabled={!product.inStock}
                  className={`flex-shrink-0 text-[11px] font-heading font-semibold px-2.5 py-1 rounded-btn transition-all ${
                    inCartIds.has(product.id)
                      ? 'bg-accent text-white'
                      : product.inStock
                      ? 'bg-primary text-white hover:bg-primary-light'
                      : 'bg-surface text-slate-muted cursor-not-allowed border border-border'
                  }`}>
                  {inCartIds.has(product.id) ? '✓' : product.inStock ? '+ Add' : 'N/A'}
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 bg-surface border-t border-border">
            <button onClick={restockAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-heading font-semibold text-sm rounded-btn hover:bg-primary-light transition-colors">
              Re-stock All ({items.filter((p) => p.inStock).length} items)
            </button>
            <Link href="/quick-order"
              className="block text-center text-[11px] font-body text-primary hover:text-primary-light transition-colors mt-2 py-1">
              Open Quick-Order Grid →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
