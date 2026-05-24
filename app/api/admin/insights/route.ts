import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkPin(req: NextRequest): boolean {
  const pin = req.headers.get('x-admin-pin')
  return pin === process.env.ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const since   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const formula = encodeURIComponent(`IS_AFTER({created_at},"${since}")`)
  const url     = `${AT_BASE}/Haya_Insights?filterByFormula=${formula}&sort[0][field]=priority&sort[0][direction]=desc&maxRecords=100`

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ entries: [], new_count: 0, pattern_count: 0 })
    const data    = await res.json()
    const records = data.records ?? []

    const entries = records.map((r: { id: string; fields: Record<string, unknown> }) => ({
      record_id:       r.id,
      insight_id:      String(r.fields.insight_id      ?? ''),
      package:         String(r.fields.package         ?? ''),
      insight_type:    String(r.fields.insight_type    ?? r.fields.package ?? ''),
      insight:         String(r.fields.insight         ?? ''),
      action_required: String(r.fields.action_required ?? ''),
      priority:        Number(r.fields.priority        ?? 0),
      status:          String(r.fields.status          ?? 'new'),
      created_at:      String(r.fields.created_at      ?? ''),
    }))

    const new_count     = entries.filter((e: { status: string }) => e.status === 'new').length
    const pattern_count = entries.filter((e: { insight_type: string }) => e.insight_type === 'pattern').length

    return NextResponse.json({ entries, new_count, pattern_count })
  } catch {
    return NextResponse.json({ entries: [], new_count: 0, pattern_count: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const { record_id, status } = await req.json() as { record_id: string; status: string }
    if (!record_id || !status) return NextResponse.json({ error: 'record_id and status required' }, { status: 400 })

    const allowed = ['acknowledged', 'dismissed', 'actioned', 'pending_approval']
    if (!allowed.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

    await fetch(`${AT_BASE}/Haya_Insights/${record_id}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields: { status } }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
