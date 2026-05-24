import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

function checkAuth(req: NextRequest): boolean {
  return req.headers.get('x-admin-pin') === ADMIN_PIN
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { record_id, discount_percent, sale_start, sale_end, cancel } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const fields: Record<string, unknown> = {}

    if (cancel) {
      fields.discount_percent = 0
    } else {
      if (discount_percent !== undefined) fields.discount_percent = Number(discount_percent)
      const saleMeta = { sale_start: sale_start ?? null, sale_end: sale_end ?? null }
      fields.notes = JSON.stringify(saleMeta)
    }

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Products/${record_id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
