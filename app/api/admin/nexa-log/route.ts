import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!

function auth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ entries: [] })
  }

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/Nexa_Log?maxRecords=50&sort[0][field]=timestamp&sort[0][direction]=desc`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ entries: [] })

    const data = await res.json()
    const entries = (data.records ?? []).map((r: {
      fields: {
        timestamp?: string
        trigger_type?: string
        action?: string
        target?: string
        field?: string
        value?: string
        reason?: string
        status?: string
      }
    }) => ({
      timestamp:    r.fields.timestamp    ?? '',
      trigger_type: r.fields.trigger_type ?? '',
      action:       r.fields.action       ?? '',
      target:       r.fields.target       ?? '',
      field:        r.fields.field        ?? '',
      value:        r.fields.value        ?? '',
      reason:       r.fields.reason       ?? '',
      status:       r.fields.status       ?? '',
    }))

    return NextResponse.json({ entries })
  } catch {
    return NextResponse.json({ entries: [] })
  }
}
