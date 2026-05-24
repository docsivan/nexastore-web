import { NextRequest, NextResponse } from 'next/server'
import { getOrderByOrderId } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const order_id = searchParams.get('id')

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  try {
    const order = await getOrderByOrderId(order_id)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Return only the fields safe to expose to the client
    const { order_id: id, created_at, payment_status, delivery_status, total, customer_name } =
      order.fields

    return NextResponse.json({
      data: { order_id: id, created_at, payment_status, delivery_status, total, customer_name },
    })
  } catch (error) {
    console.error('[GET /api/order/status]', error)
    return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 })
  }
}
