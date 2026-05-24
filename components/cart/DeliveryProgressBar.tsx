'use client'

import { formatPrice } from '@/lib/formatters'

const FREE_DELIVERY_THRESHOLD = 20

interface Props {
  subtotal: number
}

export default function DeliveryProgressBar({ subtotal }: Props) {
  const qualified = subtotal >= FREE_DELIVERY_THRESHOLD
  const remaining = Math.max(0, Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 1000) / 1000)
  const pct = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)

  return (
    <div className="rounded-btn px-3 py-2.5 mb-4" style={{ background: qualified ? '#E8F5E9' : '#F1F8E9' }}>
      {qualified ? (
        <p className="font-body text-xs font-semibold text-accent-dark flex items-center gap-1.5">
          <span>🚚</span> You qualify for FREE delivery!
        </p>
      ) : (
        <p className="font-body text-xs text-accent-dark">
          <span className="font-semibold">{formatPrice(remaining)}</span> away from free delivery
        </p>
      )}
      <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#F5A623' }}
        />
      </div>
    </div>
  )
}
