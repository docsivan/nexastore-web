/**
 * lib/pricingTiers.ts
 * Volume discount tier definitions.
 *
 * Tiers live in the Supabase `pricing_tiers` table:
 *   tier_name        (text)    — Bronze / Silver / Gold / Platinum
 *   min_quantity     (int)     — minimum units to qualify
 *   discount_percent (numeric) — percentage off base final_price
 *   label            (text)
 *   color_hex        (text)    — hex colour for UI badge
 *
 * The table is global (no per-item or per-category rows), so the upper bound
 * of each tier is derived from the next tier's min_quantity.
 * DEFAULT_TIERS below are the fallback when the table is empty or unreachable.
 */

export interface PricingTier {
  name:     string
  color:    string      // hex for badge
  min:      number
  max:      number | null
  discount: number      // percentage off
}

/** Shape of a pricing_tiers row as returned by lib/supabase getPricingTiers(). */
interface TierFields {
  tier_name?:        string
  min_quantity?:     number
  discount_percent?: number
  color_hex?:        string
}

/**
 * Maps `pricing_tiers` rows to PricingTier[], deriving each tier's `max`
 * from the next tier's `min_quantity`. Returns null when there is nothing
 * usable, so callers can fall back to DEFAULT_TIERS.
 */
export function mapTierRecords(
  records: Array<{ fields: TierFields }>
): PricingTier[] | null {
  if (!records.length) return null
  const sorted = [...records].sort(
    (a, b) => (a.fields.min_quantity ?? 0) - (b.fields.min_quantity ?? 0)
  )
  return sorted.map((r, i) => {
    const nextMin = sorted[i + 1]?.fields.min_quantity
    return {
      name:     r.fields.tier_name        ?? 'Standard',
      color:    r.fields.color_hex        ?? '#6B7280',
      min:      r.fields.min_quantity     ?? 1,
      max:      nextMin ? nextMin - 1 : null,
      discount: r.fields.discount_percent ?? 0,
    }
  })
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
