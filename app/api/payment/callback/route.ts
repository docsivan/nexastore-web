import { NextRequest, NextResponse } from 'next/server'
import { getOrderByOrderId, updateOrder, findOrCreateCustomer, recordSuccessfulOrder, updateCustomer } from '@/lib/supabase'
import { fireMakeWebhook } from '@/lib/makeWebhook'
import { writeSignal } from '@/lib/memory'

export const dynamic = 'force-dynamic'

function detectSegment(items: Array<{ name?: string; category?: string }>): string {
  const dentalTerms  = ['dental', 'bur', 'composite', 'impression', 'scaler', 'bonding', 'cement', 'forcep', 'endo', 'prophyl']
  const hospitalTerms = ['ppe', 'n95', 'kn95', 'nitrile', 'latex', 'glove', 'iv ', 'catheter', 'diagnostic', 'syringe', 'needle', 'steriliz']
  let dental = 0, hospital = 0
  for (const item of items) {
    const s = ((item.name ?? '') + ' ' + (item.category ?? '')).toLowerCase()
    if (dentalTerms.some(t  => s.includes(t))) dental++
    if (hospitalTerms.some(t => s.includes(t))) hospital++
  }
  if (dental >= 2)   return 'dental'
  if (hospital >= 2) return 'hospital'
  return 'clinic'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      cart_id,
      tran_ref,
      payment_result,
    } = body

    if (!cart_id) {
      return NextResponse.json({ error: 'cart_id missing' }, { status: 400 })
    }

    const order = await getOrderByOrderId(cart_id)
    if (!order) {
      console.error(`[payment/callback] Order not found: ${cart_id}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isPaid = payment_result?.response_status === 'A'

    await updateOrder(order.id, {
      payment_status:    isPaid ? 'Paid'    : 'Failed',
      delivery_status:   'Processing',
      payment_reference: tran_ref ?? '',
    })

    if (isPaid) {
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

      // ── Detect customer segment and persist it ────────────────────────
      try {
        const parsedItems: Array<{ name?: string; category?: string }> =
          typeof f.items === 'string' ? JSON.parse(f.items) : (f.items ?? [])
        const segment = detectSegment(parsedItems)
        // customer.id is a Supabase row UUID, not an Airtable rec… ID.
        updateCustomer(customer.id, { customer_segment: segment }).catch(() => {})
      } catch {}

      // ── Write order signal to Haya Memory (non-blocking) ──────────────
      writeSignal({
        session_id:  f.order_id ?? 'payment_callback',
        customer_id: customer.id,
        signal_type: 'order',
        action:      'payment_confirmed',
        item_code:   f.order_id ?? '',
        cart_total:  f.total ?? 0,
        page_url:    '/api/payment/callback',
        outcome:     tran_ref ?? '',
      }).catch(() => {})

      // ── Fire Make.com webhook (non-blocking) ───────────────────────────
      fireMakeWebhook('order.confirmed', {
        order_id:          f.order_id,
        tran_ref:          tran_ref ?? '',
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
        payment_reference: tran_ref        ?? '',
        notes:             f.notes         ?? '',
      }).catch(() => {})

    }

    return NextResponse.json({ received: true, paid: isPaid })
  } catch (error) {
    console.error('[POST /api/payment/callback]', error)
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 })
  }
}
