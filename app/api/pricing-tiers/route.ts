import { NextResponse } from 'next/server'
import { getPricingTiers } from '@/lib/supabase'
import { DEFAULT_TIERS, mapTierRecords } from '@/lib/pricingTiers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tiers = mapTierRecords(await getPricingTiers())
    return tiers
      ? NextResponse.json({ tiers, source: 'supabase' })
      : NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  } catch {
    return NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  }
}
