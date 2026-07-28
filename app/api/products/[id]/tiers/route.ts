import { NextRequest, NextResponse } from 'next/server'
import { getPricingTiers } from '@/lib/supabase'
import { DEFAULT_TIERS, mapTierRecords } from '@/lib/pricingTiers'

export const dynamic = 'force-dynamic'

/**
 * Volume tiers for a product.
 *
 * The Airtable Pricing_Tiers table carried optional item_code / category rows
 * for per-product overrides. The Supabase `pricing_tiers` table is global, so
 * every product currently resolves to the same ladder. params.id is retained
 * for the route contract and for reinstating overrides later.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  void params.id
  try {
    const tiers = mapTierRecords(await getPricingTiers())
    return tiers
      ? NextResponse.json({ tiers, source: 'supabase' })
      : NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  } catch (error) {
    console.error('[GET tiers]', error)
    return NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  }
}
