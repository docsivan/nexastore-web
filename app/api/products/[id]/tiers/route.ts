import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_TIERS, PricingTier } from '@/lib/pricingTiers'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!

async function fetchAirtableTiers(item_code: string, category: string): Promise<PricingTier[] | null> {
  try {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/Pricing_Tiers`)
    // Try product-specific tiers first, then category-level
    url.searchParams.set(
      'filterByFormula',
      `OR({item_code}='${item_code}',{category}='${category}')`
    )
    url.searchParams.set('sort[0][field]', 'min_qty')
    url.searchParams.set('sort[0][direction]', 'asc')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: 'no-store',
    })

    // If Pricing_Tiers table doesn't exist yet, return null to trigger fallback
    if (res.status === 404 || res.status === 422) return null
    if (!res.ok) return null

    const data = await res.json()
    if (!data.records?.length) return null

    return data.records.map((r: { fields: {
      tier_name: string; color: string
      min_qty: number; max_qty: number; discount: number
    } }) => ({
      name:     r.fields.tier_name  ?? 'Standard',
      color:    r.fields.color      ?? '#6B7280',
      min:      r.fields.min_qty    ?? 1,
      max:      r.fields.max_qty    ?? null,
      discount: r.fields.discount   ?? 0,
    }))
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // params.id is item_code; we also need category
    // For now we use DEFAULT_TIERS unless Airtable table exists
    const airtableTiers = await fetchAirtableTiers(params.id, '')
    const tiers = airtableTiers ?? DEFAULT_TIERS

    return NextResponse.json({ tiers, source: airtableTiers ? 'airtable' : 'default' })
  } catch (error) {
    console.error('[GET tiers]', error)
    return NextResponse.json({ tiers: DEFAULT_TIERS, source: 'default' })
  }
}
