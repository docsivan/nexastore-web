'use client'

import { useState, useEffect } from 'react'

interface VelocityData {
  stock:         number
  ordersToday:   number
  ordersThisWeek: number
  stockCopy:     string
  velocityCopy:  string
}

interface Props {
  itemCode: string
}

export default function ScarcityBadge({ itemCode }: Props) {
  const [data,    setData]    = useState<VelocityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${itemCode}/velocity`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [itemCode])

  if (loading || !data) return null
  if (!data.stockCopy && !data.velocityCopy) return null

  return (
    <div className="flex flex-col gap-1.5">
      {/* Stock scarcity */}
      {data.stockCopy && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-btn w-fit ${
          data.stock === 0
            ? 'bg-red-50 text-red-600 border border-red-200'
            : data.stock <= 20
            ? 'bg-orange-50 text-orange-600 border border-orange-200'
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-soft"
            style={{ backgroundColor: data.stock === 0 ? '#ef4444' : data.stock <= 20 ? '#f97316' : '#eab308' }}
          />
          {data.stockCopy}
        </div>
      )}

      {/* Order velocity */}
      {data.velocityCopy && (
        <div className="inline-flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-btn bg-primary-50 text-primary border border-primary-100 w-fit">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {data.velocityCopy}
        </div>
      )}
    </div>
  )
}
