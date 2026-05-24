import { NextRequest, NextResponse } from 'next/server'
import { writeSignal, HayaSignal } from '@/lib/memory'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      signal_type, session_id, item_code, query,
      customer_id, page_url, cart_total, chat_summary, action, outcome,
    } = body

    if (!signal_type || !session_id) {
      return NextResponse.json({ success: true })
    }

    const signal: HayaSignal = {
      session_id,
      signal_type,
      action:    action ?? signal_type,
      page_url:  page_url ?? '',
      ...(customer_id   && { customer_id }),
      ...(item_code     && { item_code }),
      ...(query         && { query }),
      ...(cart_total    !== undefined && { cart_total }),
      ...(chat_summary  && { chat_summary }),
      ...(outcome       && { outcome }),
    }

    await writeSignal(signal)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
