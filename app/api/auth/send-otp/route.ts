import { NextRequest, NextResponse } from 'next/server'
import { getCustomerByPhone } from '@/lib/supabase'
import { otpStore } from '@/lib/otpStore'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone?.trim()) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const cleaned = phone.trim()
    const customer = await getCustomerByPhone(cleaned)
    if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const f = customer.fields
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes

    otpStore.set(cleaned, {
      otp,
      expiry,
      customer_name: f.customer_name,
      email:         f.email,
      customer_id:   f.customer_id,
      clinic_name:   f.clinic_name,
      city:          f.city,
    })

    // Fire Make.com webhook with OTP
    const webhookUrl = process.env.MAKE_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:         'otp_login',
          customer_name: f.customer_name,
          email:         f.email,
          phone:         cleaned,
          otp,
          expiry_mins:   10,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      email_hint: f.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      customer_name: f.customer_name,
    })
  } catch (e) {
    console.error('[POST /api/auth/send-otp]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

