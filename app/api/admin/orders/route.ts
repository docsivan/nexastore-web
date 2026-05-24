import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders } from '@/lib/airtable'
export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-pin') === process.env.ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const records = await getAllOrders(500)
    const orders = records
      .map(o => {
        let items = []
        try { items = JSON.parse(o.fields.items) } catch {}
        return {
          record_id:         o.id,
          order_id:          o.fields.order_id,
          created_at:        o.fields.created_at || o.createdTime || '',
          customer_name:     o.fields.customer_name,
          clinic_name:       o.fields.clinic_name,
          phone:             o.fields.phone,
          email:             o.fields.email,
          city:              o.fields.city,
          items,
          subtotal:          o.fields.subtotal,
          delivery_charge:   o.fields.delivery_charge,
          total:             o.fields.total,
          payment_status:    o.fields.payment_status,
          delivery_status:   o.fields.delivery_status,
          payment_reference: o.fields.payment_reference,
          notes:             o.fields.notes,
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('[GET /api/admin/orders]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
