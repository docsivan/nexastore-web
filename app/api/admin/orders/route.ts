import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const records = await getAllOrders(500)
    const orders = records
      .map(o => {
        let items = []
        try { items = JSON.parse(o.items) } catch {}
        return {
          record_id:         o.id,
          order_id:          o.order_id,
          created_at:        o.created_at || o.createdTime || '',
          customer_name:     o.customer_name,
          clinic_name:       o.clinic_name,
          phone:             o.phone,
          email:             o.email,
          city:              o.city,
          items,
          subtotal:          o.subtotal,
          delivery_charge:   o.delivery_charge,
          total:             o.total,
          payment_status:    o.payment_status,
          delivery_status:   o.delivery_status,
          payment_reference: o.payment_reference,
          notes:             o.notes,
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('[GET /api/admin/orders]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
