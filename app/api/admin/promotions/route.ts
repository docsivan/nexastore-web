import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest): boolean {
  return req.headers.get('x-admin-pin') === process.env.ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const formula = encodeURIComponent(`{status}="active"`)
  const res = await fetch(
    `${AT_BASE}/Haya_Promotions?filterByFormula=${formula}&maxRecords=20&sort[0][field]=ends_at&sort[0][direction]=asc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ promotions: [] })

  const data = await res.json()
  const promotions = (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    promo_id:         String(r.fields.promo_id         ?? ''),
    item_code:        String(r.fields.item_code        ?? ''),
    promo_discount:   Number(r.fields.promo_discount   ?? 0),
    original_discount: Number(r.fields.original_discount ?? 0),
    starts_at:        String(r.fields.starts_at        ?? ''),
    ends_at:          String(r.fields.ends_at          ?? ''),
    status:           String(r.fields.status           ?? ''),
    approved_by:      String(r.fields.approved_by      ?? ''),
  }))

  return NextResponse.json({ promotions })
}
