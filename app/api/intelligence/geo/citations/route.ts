import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(
      `${AT_BASE}/Haya_Citations?sort[0][field]=fetched_at&sort[0][direction]=desc&maxRecords=50`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ citations: [] })
    const data = await res.json()
    const citations = (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
      query:      String(r.fields.query      ?? ''),
      platform:   String(r.fields.platform   ?? 'google'),
      cited:      Boolean(r.fields.cited),
      position:   Number(r.fields.position   ?? 0),
      context:    String(r.fields.context    ?? ''),
      fetched_at: String(r.fields.fetched_at ?? ''),
    }))
    return NextResponse.json({ citations }, { headers: { 'Cache-Control': 's-maxage=300' } })
  } catch (e) {
    return NextResponse.json({ citations: [], error: String(e) })
  }
}
