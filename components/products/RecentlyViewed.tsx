'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatters'

const STORAGE_KEY = 'hayat_recently_viewed'
const MAX_ITEMS = 8
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface RecentItem {
  item_code: string
  name: string
  final_price: number
  category: string
  brand: string
  savedAt: number
}

export function trackProductView(item: Omit<RecentItem, 'savedAt'>) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const items: RecentItem[] = raw ? JSON.parse(raw) : []
    const now = Date.now()
    const filtered = items
      .filter((i) => i.item_code !== item.item_code && now - i.savedAt < TTL_MS)
      .slice(0, MAX_ITEMS - 1)
    const updated = [{ ...item, savedAt: now }, ...filtered]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const all: RecentItem[] = JSON.parse(raw)
      const now = Date.now()
      const valid = all.filter((i) => now - i.savedAt < TTL_MS).slice(0, MAX_ITEMS)
      setItems(valid)
    } catch {}
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <h2 className="font-heading font-bold text-base text-primary-dark mb-3">Recently Viewed</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => (
          <Link
            key={item.item_code}
            href={`/products/${item.item_code}`}
            className="flex-shrink-0 w-36 card card-hover flex flex-col overflow-hidden"
          >
            <div
              className="h-24 flex items-center justify-center text-white/20 text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #0056a8 100%)' }}
            >
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="p-2.5 flex flex-col gap-1">
              <p className="font-body text-[9px] text-accent-dark font-semibold uppercase">{item.brand}</p>
              <p className="font-heading font-semibold text-[11px] text-primary-dark leading-snug line-clamp-2">
                {item.name}
              </p>
              <p className="font-heading font-bold text-xs text-primary-dark mt-auto">
                {formatPrice(item.final_price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
