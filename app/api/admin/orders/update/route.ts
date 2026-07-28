import { NextRequest, NextResponse } from 'next/server'
import { updateOrder, getOrderByOrderId } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { record_id, order_id, delivery_status, payment_status } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const updates: Record<string, string> = {}
    if (delivery_status) updates.delivery_status = delivery_status
    if (payment_status)  updates.payment_status  = payment_status

    await updateOrder(record_id, updates)

    // ── Dispatch notification ─────────────────────────────────────────────
    if (delivery_status?.toLowerCase() === 'dispatched') {
      const webhookUrl = process.env.MAKE_DISPATCH_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL
      if (webhookUrl && order_id) {
        try {
          const order = await getOrderByOrderId(order_id)
          if (order) {
            const f = order.fields
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event:         'order_dispatched',
                order_id:      f.order_id,
                customer_name: f.customer_name,
                email:         f.email,
                phone:         f.phone,
                city:          f.city,
                items:         f.items,
                total:         f.total,
              }),
            })
            console.log(`[dispatch] Webhook fired for ${f.order_id}`)
          }
        } catch (e) {
          console.warn('[dispatch] Webhook failed — order updated anyway:', e)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[PATCH /api/admin/orders/update]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
