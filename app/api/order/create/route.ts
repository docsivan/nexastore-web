import { NextRequest, NextResponse } from 'next/server'
import { createOrder, findOrCreateCustomer } from '@/lib/supabase'
import { syncOrderToERP } from '@/lib/erpnext-sync'
import { OrderItem } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

interface CreateOrderBody {
  // Customer / contact
  firstName: string
  lastName: string
  email: string
  phone: string
  company?: string

  // Delivery
  address: string
  city: string
  governorate: string
  notes?: string

  // Cart
  items: Array<{
    product: {
      id: string        // = item_code
      name: string
      price: number
      unit: string
    }
    quantity: number
  }>

  // Totals (pre-calculated by frontend)
  subtotal: number
  vat: number
  total: number
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateOrderBody = await req.json()

    const {
      firstName, lastName, email, phone, company,
      address, city, governorate, notes,
      items, subtotal, vat, total,
    } = body

    if (!items?.length || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const customer_name = `${firstName} ${lastName}`.trim()
    const full_address  = `${address}, ${governorate}`

    // ── 1. Find or create customer ──────────────────────────────────────────
    const { customer } = await findOrCreateCustomer({
      customer_name,
      clinic_name: company,
      phone,
      email,
      address: full_address,
      city,
      preferred_channel: 'web',
    })

    // ── 2. Serialise cart items ─────────────────────────────────────────────
    const orderItems: OrderItem[] = items.map((i) => ({
      item_code:   i.product.id,
      name:        i.product.name,
      quantity:    i.quantity,
      final_price: i.product.price,
      pack_size:   i.product.unit,
    }))

    // Delivery charge: free over OMR 50
    const delivery_charge = subtotal >= 50 ? 0 : 2.500

    // ── 3. Create order in Supabase ─────────────────────────────────────────
    const order = await createOrder({
      customer_name,
      clinic_name:       company ?? '',
      phone,
      email,
      address:           full_address,
      city,
      items:             JSON.stringify(orderItems),
      subtotal,
      delivery_charge,
      total:             Math.round((total + delivery_charge) * 1000) / 1000,
      payment_status:    'Pending',
      delivery_status:   'Processing',
      payment_reference: '',
      notes:             notes ?? '',
    })

    // ── 4. Mirror into ERPNext ──────────────────────────────────────────────
    // Fire and forget: the customer must never wait on ERP, and an ERP outage
    // must never fail a paid order. syncOrderToERP never throws; failures are
    // written to ai_log for replay.
    void syncOrderToERP({
      order_id:        order.order_id,
      customer_name,
      clinic_name:     company ?? '',
      phone,
      email,
      items:           orderItems,
      total:           order.total,
      delivery_charge,
      notes:           notes ?? '',
    }).then((r) => {
      if (r.skipped) console.warn(`[erp] ${order.order_id} skipped: ${r.error}`)
      else if (r.success) console.log(`[erp] ${order.order_id} synced → ${r.erp_order_id}`)
      else console.error(`[erp] ${order.order_id} sync failed: ${r.error}`)
    })

    return NextResponse.json(
      {
        success:         true,
        order_id:        order.order_id,
        airtable_id:     order.id,
        customer_id:     customer.id,
        delivery_charge,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/order/create]', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
