import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone, items, total, customer_name } = await req.json()

    if (!phone || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const webhookUrl = process.env.MAKE_DISPATCH_WEBHOOK_URL
    if (!webhookUrl) return NextResponse.json({ success: false, reason: 'no webhook' })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexastore.io'

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:         'abandoned_cart',
        phone,
        customer_name: customer_name ?? 'Valued Customer',
        item_count:    items.length,
        total:         Number(total).toFixed(2),
        cart_url:      `${siteUrl}/cart`,
        message:       `Hi ${customer_name ?? 'there'}, you left ${items.length} item${items.length > 1 ? 's' : ''} worth \${Number(total).toFixed(2)} in your cart. Complete your order here: ${siteUrl}/cart`,
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
