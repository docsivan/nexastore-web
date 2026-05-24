/**
 * lib/pricingTiers.ts
 * Volume discount tier definitions.
 *
 * To use real Airtable tiers, create a "Pricing_Tiers" table with fields:
 *   item_code (text)   — leave blank for category-level tiers
 *   category  (text)   — e.g. "infection-control"
 *   tier_name (text)   — Bronze / Silver / Gold / Platinum
 *   min_qty   (number) — minimum units to qualify
 *   max_qty   (number) — maximum units (blank = unlimited)
 *   discount  (number) — percentage off base final_price
 *   color     (text)   — hex colour for UI badge
 *
 * Until that table exists, DEFAULT_TIERS below are used as fallback.
 */

export interface PricingTier {
  name:     string
  color:    string      // hex for badge
  min:      number
  max:      number | null
  discount: number      // percentage off
}

export const DEFAULT_TIERS: PricingTier[] = [
  { name: 'Standard', color: '#6B7280', min: 1,  max: 9,    discount: 0  },
  { name: 'Silver',   color: '#64748B', min: 10, max: 24,   discount: 5  },
  { name: 'Gold',     color: '#D97706', min: 25, max: 49,   discount: 10 },
  { name: 'Platinum', color: '#7C3AED', min: 50, max: null, discount: 15 },
]

/** Returns the tier the given quantity currently qualifies for. */
export function getTierForQty(qty: number, tiers: PricingTier[]): PricingTier {
  const sorted = [...tiers].sort((a, b) => b.min - a.min)
  return sorted.find((t) => qty >= t.min) ?? tiers[0]
}

/** Returns the next tier above the given quantity, or null if already at max. */
export function getNextTier(qty: number, tiers: PricingTier[]): PricingTier | null {
  const sorted = [...tiers].sort((a, b) => a.min - b.min)
  return sorted.find((t) => t.min > qty) ?? null
}

/** Calculates price after discount. */
export function calcDiscountedPrice(basePrice: number, discountPercent: number): number {
  return Math.round(basePrice * (1 - discountPercent / 100) * 1000) / 1000
}

/** How many units still needed to reach the next tier. */
export function unitsToNextTier(qty: number, tiers: PricingTier[]): number {
  const next = getNextTier(qty, tiers)
  return next ? next.min - qty : 0
}
