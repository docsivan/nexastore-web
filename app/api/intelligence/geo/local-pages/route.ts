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
    const formula = encodeURIComponent(`AND({content_tier}="local",{status}="published")`)
    const res = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&fields[]=content_id&maxRecords=100`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ count: 0 })
    const data = await res.json()
    return NextResponse.json({ count: (data.records ?? []).length }, { headers: { 'Cache-Control': 's-maxage=300' } })
  } catch (e) {
    return NextResponse.json({ count: 0, error: String(e) })
  }
}
