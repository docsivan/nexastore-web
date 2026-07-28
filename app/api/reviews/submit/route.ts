import { NextRequest, NextResponse } from 'next/server'
import { getOrderByOrderId, createReview } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function nanoid(): string {
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function orderContainsItem(itemsJson: string, itemCode: string): boolean {
  try {
    const items = JSON.parse(itemsJson)
    if (Array.isArray(items)) {
      return items.some(
        (i: { item_code?: string; product?: { id?: string; item_code?: string } }) =>
          i.item_code === itemCode ||
          i.product?.id === itemCode ||
          i.product?.item_code === itemCode
      )
    }
  } catch {}
  // Fallback: plain text search
  return itemsJson.includes(itemCode)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      order_id:    string | number
      item_code:   string
      rating:      number
      review_text: string
      customer_id?: string
    }

    const { order_id, item_code, rating, review_text, customer_id } = body

    if (!order_id)    return NextResponse.json({ error: 'order_id required' },    { status: 400 })
    if (!item_code)   return NextResponse.json({ error: 'item_code required' },   { status: 400 })
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })
    }
    if (!review_text?.trim()) return NextResponse.json({ error: 'review_text required' }, { status: 400 })

    // Validate order exists
    const order = await getOrderByOrderId(String(order_id))
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Validate item was in the order
    if (!orderContainsItem(order.fields.items ?? '[]', item_code)) {
      return NextResponse.json({ error: 'Item not found in this order' }, { status: 400 })
    }

    // Create review — status 'pending' until moderated
    await createReview({
      review_id:         nanoid(),
      order_id:          String(order_id),
      customer_id:       customer_id ?? '',
      item_code,
      rating,
      review_text:       review_text.trim().slice(0, 2000),
      verified_purchase: true,
      status:            'pending',
    })

    return NextResponse.json({ ok: true, message: 'Review submitted and awaiting moderation' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
