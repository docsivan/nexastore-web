import { NextRequest, NextResponse } from 'next/server'
import { getOrdersByPhone } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const phone = new URL(req.url).searchParams.get('phone')
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    const records = await getOrdersByPhone(phone)
    const orders = records
      .map(o => {
        let items = []
        try { items = JSON.parse(o.items) } catch {}
        return {
          record_id:       o.id,
          order_id:        o.order_id,
          created_at:      o.created_at || o.createdTime || '',
          items,
          subtotal:        o.subtotal,
          delivery_charge: o.delivery_charge,
          total:           o.total,
          payment_status:  o.payment_status,
          delivery_status: o.delivery_status,
          city:            o.city,
          notes:           o.notes,
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('[GET /api/customer/orders]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
