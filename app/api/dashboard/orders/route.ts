import { NextRequest, NextResponse } from 'next/server'
import { AirtableOrder, OrderFields } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ orders: [] })

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Orders`)
    url.searchParams.set('filterByFormula', `{phone}='${phone.replace(/'/g, "\\'")}'`)
    url.searchParams.set('sort[0][field]', 'created_at')
    url.searchParams.set('sort[0][direction]', 'desc')
    url.searchParams.set('maxRecords', '50')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ orders: [] })
    const data = await res.json()

    const orders = (data.records ?? []).map((r: AirtableOrder) => {
      const f = r.fields as OrderFields
      let items: unknown[] = []
      try { items = typeof f.items === 'string' ? JSON.parse(f.items) : f.items } catch {}
      return {
        record_id:        r.id,
        order_id:         f.order_id,
        created_at:       f.created_at,
        items,
        subtotal:         f.subtotal,
        delivery_charge:  f.delivery_charge,
        total:            f.total,
        payment_status:   f.payment_status,
        delivery_status:  f.delivery_status,
        city:             f.city,
        notes:            f.notes,
      }
    })

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ orders: [] })
  }
}
