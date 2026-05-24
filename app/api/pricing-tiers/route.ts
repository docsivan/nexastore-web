import { NextResponse } from 'next/server'
import { getPricingTiers } from '@/lib/airtable'
import { DEFAULT_TIERS } from '@/lib/pricingTiers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const records = await getPricingTiers()
    if (!records.length) {
      return NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
    }
    const sorted = [...records].sort(
      (a, b) => (a.fields.min_quantity ?? 0) - (b.fields.min_quantity ?? 0)
    )
    const tiers = sorted.map((r, i) => ({
      name:     r.fields.tier_name        ?? 'Standard',
      color:    r.fields.color_hex        ?? '#6B7280',
      min:      r.fields.min_quantity     ?? 1,
      max:      sorted[i + 1]?.fields.min_quantity
                  ? (sorted[i + 1].fields.min_quantity - 1)
                  : null,
      discount: r.fields.discount_percent ?? 0,
    }))
    return NextResponse.json({ tiers, source: 'airtable' })
  } catch {
    return NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  }
}
