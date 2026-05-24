import { NextRequest, NextResponse } from 'next/server'
import {
  getOrderByOrderId,
  updateOrder,
  findOrCreateCustomer,
  recordSuccessfulOrder,
} from '@/lib/airtable'
import { fireMakeWebhook } from '@/lib/makeWebhook'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, simulate } = body as {
      order_id: string
      simulate: 'success' | 'failure'
    }

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const order = await getOrderByOrderId(order_id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isPaid   = simulate !== 'failure'
    const tran_ref = isPaid ? `DUMMY-${Date.now().toString(36).toUpperCase()}` : ''
    const now      = new Date()

    if (isPaid) {
      await updateOrder(order.id, {
        payment_status:    'Paid',
        delivery_status:   'Processing',
        payment_reference: tran_ref,
      })

      const f = order.fields
      const { customer } = await findOrCreateCustomer({
        customer_name: f.customer_name,
        phone:         f.phone,
        email:         f.email,
        address:       f.address,
        city:          f.city,
      })

      await recordSuccessfulOrder(
        customer.id,
        customer.fields.total_orders ?? 0,
        customer.fields.total_spent  ?? 0,
        f.total
      )

      // ── Fire Make.com webhook (non-blocking) ───────────────────────────
      fireMakeWebhook('order.confirmed', {
        order_id:          f.order_id,
        tran_ref,
        customer_name:     f.customer_name,
        phone:             f.phone,
        email:             f.email,
        clinic_name:       f.clinic_name   ?? '',
        city:              f.city          ?? '',
        address:           f.address       ?? '',
        items:             typeof f.items === 'string' ? f.items : JSON.stringify(f.items ?? []),
        subtotal:          f.subtotal      ?? 0,
        delivery_charge:   f.delivery_charge ?? 0,
        total:             f.total         ?? 0,
        payment_reference: tran_ref,
        notes:             f.notes         ?? '',
      }).catch(() => {})   // fire-and-forget — never block the response

      return NextResponse.json({
        success:  true,
        order_id,
        tran_ref,
        redirect: `/order-confirmation?id=${order_id}`,
      })

    } else {
      const reminderData = {
        reminder_1hr_due:  new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        reminder_1day_due: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        reminder_status:   'scheduled',
      }

      await updateOrder(order.id, {
        payment_status:  'Failed',
        delivery_status: 'Processing',
        notes:           JSON.stringify(reminderData),
      })

      return NextResponse.json({
        success:  false,
        order_id,
        redirect: `/checkout/failed?id=${order_id}`,
      })
    }

  } catch (error) {
    console.error('[POST /api/payment/create]', error)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}
