import { NextRequest, NextResponse } from 'next/server'
import { getCustomerByPhone } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    const customer = await getCustomerByPhone(phone.trim())
    if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const f = customer
    return NextResponse.json({
      success: true,
      customer: {
        phone:           f.phone,
        customer_name:   f.customer_name,
        clinic_name:     f.clinic_name,
        customer_id:     f.customer_id,
        city:            f.city,
        total_orders:    f.total_orders,
        total_spent:     f.total_spent,
        last_order_date: f.last_order_date,
      },
    })
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
