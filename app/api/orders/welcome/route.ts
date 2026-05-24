import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { order_id, customer_name, phone, total_orders } = await req.json()

    if (total_orders !== 1) return NextResponse.json({ skipped: true })
    if (!phone || !order_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const webhookUrl = process.env.MAKE_DISPATCH_WEBHOOK_URL
    if (!webhookUrl) return NextResponse.json({ success: false, reason: 'no webhook' })

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:         'welcome_first_order',
        phone,
        customer_name: customer_name ?? 'Valued Customer',
        order_id,
        message:       `Welcome to NexaStore! Your first order #${order_id} is confirmed. We deliver same day in Muscat. Your account is now active.`,
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
