'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/ToastNotification'
import { useCartContext } from '@/context/CartContext'
import { formatPrice } from '@/lib/formatters'
import { Product } from '@/lib/types'

const MAX_FAVOURITES = 20

interface Props {
  customerRecordId: string
  initialFavourites: string[]
}

export default function Favourites({ customerRecordId, initialFavourites }: Props) {
  const { showToast } = useToast()
  const { addItem } = useCartContext()
  const [codes, setCodes] = useState<string[]>(initialFavourites)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (codes.length === 0) { setProducts([]); return }
    setLoading(true)
    Promise.all(
      codes.slice(0, MAX_FAVOURITES).map(c =>
        fetch(`/api/products/${c}`).then(r => r.ok ? r.json() : null).catch(() => null)
      )
    )
      .then(results => setProducts(results.filter(Boolean) as Product[]))
      .finally(() => setLoading(false))
  }, [codes])

  const saveFavourites = async (newCodes: string[]) => {
    try {
      const notes = JSON.stringify({ favourites: newCodes })
      await fetch('/api/dashboard/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: customerRecordId, notes }),
      })
    } catch {}
  }

  const removeFavourite = async (code: string) => {
    const updated = codes.filter(c => c !== code)
    setCodes(updated)
    setProducts(prev => prev.filter(p => p.id !== code))
    await saveFavourites(updated)
    showToast('Removed from favourites', 'info')
  }

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl" />)}
    </div>
  )

  if (products.length === 0) return (
    <div className="bg-white rounded-xl border border-border p-10 text-center">
      <p className="text-3xl mb-2">❤️</p>
      <p className="font-heading font-semibold text-primary-dark">No favourites yet</p>
      <p className="font-body text-slate-muted text-sm mt-1">Heart products while browsing to save them here</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {products.map(p => (
        <div key={p.id} className="card flex flex-col overflow-hidden">
          <Link href={`/products/${p.id}`}>
            <div
              className="h-28 flex items-center justify-center text-white/20 text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #0056a8 100%)' }}
            >
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          </Link>
          <div className="p-2.5 flex flex-col gap-1.5 flex-1">
            <p className="font-body text-[10px] text-accent-dark font-semibold uppercase">{p.brand}</p>
            <Link href={`/products/${p.id}`}>
              <p className="font-heading font-semibold text-xs text-primary-dark leading-snug line-clamp-2 hover:text-primary transition-colors">
                {p.name}
              </p>
            </Link>
            <p className="font-heading font-bold text-sm text-primary-dark mt-auto">{formatPrice(p.price)}</p>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => { addItem(p, 1); showToast(`${p.name} added to cart`, 'success') }}
                disabled={!p.inStock}
                className="flex-1 text-xs font-body font-medium bg-primary-50 text-primary hover:bg-primary hover:text-white transition-colors py-1.5 rounded-btn disabled:opacity-40"
              >
                + Cart
              </button>
              <button
                onClick={() => removeFavourite(p.id)}
                className="p-1.5 rounded-btn text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
