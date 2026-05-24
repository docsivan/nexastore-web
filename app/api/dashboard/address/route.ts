import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

export async function PUT(req: NextRequest) {
  try {
    const { record_id, address, city } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers/${record_id}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { address, city } }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
