import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateCustomer } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, clinic_name, phone, email, address, city, preferred_channel, notes } = body

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'At least phone or email is required' },
        { status: 400 }
      )
    }

    const result = await findOrCreateCustomer({
      customer_name: customer_name ?? '',
      clinic_name,
      phone:  phone  ?? '',
      email:  email  ?? '',
      address,
      city,
      preferred_channel,
      notes,
    })

    return NextResponse.json({
      data:    result.customer.fields,
      id:      result.customer.id,
      created: result.created,
    })
  } catch (error) {
    console.error('[POST /api/customer/find-or-create]', error)
    return NextResponse.json({ error: 'Customer lookup failed' }, { status: 500 })
  }
}
