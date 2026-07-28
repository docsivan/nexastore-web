import { NextRequest, NextResponse } from 'next/server'
import { createDisclaimerLog } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { session_id, question, customer_phone, customer_name } = await req.json()

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              || req.headers.get('x-real-ip')
              || 'unknown'

    const user_agent = req.headers.get('user-agent') || 'unknown'

    await createDisclaimerLog({
      session_id:     session_id || 'anonymous',
      question:       question   || '',
      accepted_at:    new Date().toISOString(),
      customer_phone: customer_phone || 'guest',
      customer_name:  customer_name  || 'guest',
      ip_address:     ip,
      user_agent,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[POST /api/chat/disclaimer]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
