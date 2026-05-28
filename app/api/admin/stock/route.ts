import { NextRequest, NextResponse } from 'next/server'
import { AirtableProduct, ProductFields } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Products`)
    url.searchParams.set('maxRecords', '200')
    url.searchParams.set('sort[0][field]', 'stock_quantity')
    url.searchParams.set('sort[0][direction]', 'asc')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ products: [] })
    const data = await res.json()

    const products = (data.records ?? []).map((r: AirtableProduct) => {
      const f = r.fields as ProductFields
      return {
        record_id:      r.id,
        item_code:      f.item_code,
        name:           f.name,
        brand:          f.brand,
        category:       f.category,
        stock_quantity: f.stock_quantity ?? 0,
        is_active:      f.is_active,
        final_price:    f.final_price,
      }
    })

    return NextResponse.json({ products })
  } catch {
    return NextResponse.json({ products: [] })
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { record_id, stock_quantity, is_active } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const fields: Record<string, unknown> = {}
    if (stock_quantity !== undefined) fields.stock_quantity = Number(stock_quantity)
    if (is_active !== undefined) fields.is_active = is_active

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Products/${record_id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
