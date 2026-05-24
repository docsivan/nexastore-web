import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { otpStore } from '@/lib/otpStore'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()
    if (!phone?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
    }

    const cleaned = phone.trim()
    const record  = otpStore.get(cleaned)

    if (!record) return NextResponse.json({ error: 'expired' }, { status: 401 })
    if (Date.now() > record.expiry) {
      otpStore.delete(cleaned)
      return NextResponse.json({ error: 'expired' }, { status: 401 })
    }
    if (record.otp !== otp.trim()) {
      return NextResponse.json({ error: 'invalid' }, { status: 401 })
    }

    otpStore.delete(cleaned)

    return NextResponse.json({
      success: true,
      customer: {
        phone,
        customer_name: record.customer_name,
        clinic_name:   record.clinic_name,
        customer_id:   record.customer_id,
        city:          record.city,
        email:         record.email,
        address:       (record as typeof record & { address?: string }).address ?? '',
      },
    })
  } catch (e) {
    console.error('[POST /api/auth/verify-otp]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
