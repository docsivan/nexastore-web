import { NextRequest, NextResponse } from 'next/server'
import { OrderFields } from '@/lib/airtableTypes'
import { getOrdersByPhone } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ orders: [] })

  try {
    const records = (await getOrdersByPhone(phone)).slice(0, 50)

    const orders = records.map((r) => {
      const f = r as OrderFields
      let items: unknown[] = []
      try { items = typeof f.items === 'string' ? JSON.parse(f.items) : f.items } catch {}
      return {
        record_id:        r.id,
        order_id:         f.order_id,
        created_at:       f.created_at || r.createdTime || '',
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
