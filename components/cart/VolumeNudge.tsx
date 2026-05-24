'use client'

import { CartItem } from '@/lib/types'
import { DEFAULT_TIERS, getNextTier } from '@/lib/pricingTiers'

interface Props {
  items: CartItem[]
}

export default function VolumeNudge({ items }: Props) {
  const nudges = items
    .map((item) => {
      const next = getNextTier(item.quantity, DEFAULT_TIERS)
      if (!next) return null
      const needed = next.min - item.quantity
      return { name: item.product.name, needed, discount: next.discount }
    })
    .filter(Boolean) as { name: string; needed: number; discount: number }[]

  if (nudges.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      {nudges.slice(0, 3).map((n, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-btn px-3 py-2 border"
          style={{ background: '#FFF8E1', borderColor: '#FFD54F' }}
        >
          <span className="text-sm flex-shrink-0">🏷️</span>
          <p className="font-body text-xs text-amber-800">
            Add <span className="font-semibold">{n.needed} more</span>{' '}
            {n.name.length > 30 ? n.name.slice(0, 30) + '…' : n.name} to get{' '}
            <span className="font-semibold">{n.discount}% off</span>
          </p>
        </div>
      ))}
    </div>
  )
}
