'use client'

import { useState, useEffect } from 'react'
import { PricingTier, DEFAULT_TIERS, getTierForQty, getNextTier, calcDiscountedPrice, unitsToNextTier } from '@/lib/pricingTiers'
import { formatPrice } from '@/lib/formatters'
import { useCartContext } from '@/context/CartContext'

interface Props {
  itemCode:  string
  basePrice: number
}

export default function TieredPricingBar({ itemCode, basePrice }: Props) {
  const { getItemQty }     = useCartContext()
  const [tiers, setTiers]  = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)

  const cartQty = getItemQty(itemCode)

  useEffect(() => {
    fetch('/api/pricing-tiers')
      .then((r) => r.json())
      .then((d) => { setTiers(d.tiers?.length ? d.tiers : DEFAULT_TIERS); setLoading(false) })
      .catch(() => { setTiers(DEFAULT_TIERS); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="border border-border rounded-card p-4 space-y-2 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded" />
      <div className="flex gap-1.5">
        {[1,2,3,4].map(i => <div key={i} className="flex-1 h-12 bg-gray-100 rounded" />)}
      </div>
      <div className="h-2 bg-gray-100 rounded-full" />
    </div>
  )

  if (tiers.length < 2) return null

  const currentTier = getTierForQty(cartQty, tiers)
  const nextTier    = getNextTier(cartQty, tiers)
  const toNext      = unitsToNextTier(cartQty, tiers)

  // Progress within current tier range
  const tierMin  = currentTier.min
  const tierMax  = nextTier ? nextTier.min : tierMin + 50
  const progress = nextTier
    ? Math.min(100, ((cartQty - tierMin) / (tierMax - tierMin)) * 100)
    : 100

  const discountedPrice = calcDiscountedPrice(basePrice, currentTier.discount)
  const savings         = cartQty > 0
    ? Math.round((basePrice - discountedPrice) * cartQty * 1000) / 1000
    : 0

  return (
    <div className="border border-border rounded-card p-4 bg-gradient-to-br from-surface to-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading font-semibold text-sm text-primary-dark">Volume Pricing</p>
        {savings > 0 && (
          <span className="text-[11px] font-body font-semibold text-accent-dark bg-accent-50 px-2 py-0.5 rounded-full">
            Saving {formatPrice(savings)}
          </span>
        )}
      </div>

      {/* Tier badges */}
      <div className="flex items-center gap-1.5 mb-3">
        {tiers.map((tier, i) => {
          const isActive = getTierForQty(cartQty, tiers).name === tier.name
          return (
            <div
              key={tier.name}
              className={`flex-1 text-center py-1.5 rounded text-[10px] font-heading font-semibold transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-surface border border-border text-slate-muted'
              }`}
              style={isActive ? { backgroundColor: tier.color } : {}}
            >
              <div>{tier.name}</div>
              <div className={`text-[9px] font-body mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-muted'}`}>
                {tier.discount === 0 ? 'Base' : `${tier.discount}% off`}
              </div>
              <div className={`text-[9px] font-body ${isActive ? 'text-white/70' : 'text-slate-muted'}`}>
                {tier.max ? `${tier.min}–${tier.max}` : `${tier.min}+`} units
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      {nextTier && (
        <>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, progress)}%`,
                backgroundColor: currentTier.color,
              }}
            />
          </div>
          <p className="font-body text-xs text-slate-muted">
            {cartQty === 0 ? (
              <>Add <span className="font-semibold text-primary">{tiers[1].min} units</span> to unlock <span className="font-semibold" style={{ color: tiers[1].color }}>{tiers[1].name}</span> pricing ({tiers[1].discount}% off)</>
            ) : (
              <>Add <span className="font-semibold text-primary">{toNext} more</span> to unlock <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.name}</span> pricing — save {nextTier.discount}%</>
            )}
          </p>
        </>
      )}

      {/* At max tier */}
      {!nextTier && cartQty > 0 && (
        <p className="font-body text-xs text-accent-dark font-semibold">
          ✓ You&apos;re on our best pricing — {currentTier.discount}% off applied
        </p>
      )}

      {/* Current unit price */}
      {currentTier.discount > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <span className="font-body text-xs text-slate-muted line-through">{formatPrice(basePrice)}</span>
          <span className="font-heading font-bold text-sm" style={{ color: currentTier.color }}>
            {formatPrice(discountedPrice)}
          </span>
          <span className="font-body text-xs text-slate-muted">/ unit at this tier</span>
        </div>
      )}
    </div>
  )
}
