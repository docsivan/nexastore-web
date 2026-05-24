import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

interface Params {
  params: { item_code: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { item_code } = params
  if (!item_code) return NextResponse.json({ error: 'item_code required' }, { status: 400 })

  try {
    const formula = encodeURIComponent(`AND({item_code}="${item_code}",{published}=TRUE())`)
    const res     = await fetch(
      `${AT_BASE}/Haya_Reviews?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc&maxRecords=50`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )

    if (!res.ok) return NextResponse.json({ reviews: [], averageRating: 0, count: 0 })

    const data    = await res.json()
    const records = data.records ?? []

    const reviews = records.map((r: { id: string; fields: Record<string, unknown> }) => ({
      id:                r.id,
      review_id:         String(r.fields.review_id         ?? ''),
      customer_id:       String(r.fields.customer_id       ?? ''),
      rating:            Number(r.fields.rating             ?? 0),
      review_text:       String(r.fields.review_text        ?? ''),
      verified_purchase: Boolean(r.fields.verified_purchase ?? false),
      created_at:        String(r.fields.created_at         ?? ''),
    }))

    const count         = reviews.length
    const averageRating = count > 0
      ? Math.round((reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / count) * 10) / 10
      : 0

    return NextResponse.json({ reviews, averageRating, count })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
