import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAdmin(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

async function getRecord(): Promise<{ id: string; value: string } | null> {
  try {
    const formula = encodeURIComponent(`{config_key}='second_language'`)
    const res = await fetch(
      `${AT_BASE}/Store_Config?filterByFormula=${formula}&maxRecords=1`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const rec = data.records?.[0]
    if (!rec) return null
    return { id: rec.id, value: String(rec.fields.config_value ?? 'none') }
  } catch {
    return null
  }
}

export async function GET() {
  if (!API_KEY || !BASE_ID) return NextResponse.json({ second_language: 'none' })
  const rec = await getRecord()
  return NextResponse.json({ second_language: rec?.value ?? 'none' })
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { second_language } = await req.json() as { second_language: string }
  const allowed = ['none', 'ar', 'fr', 'hi', 'ur']
  if (!allowed.includes(second_language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const existing = await getRecord()

  if (existing) {
    await fetch(`${AT_BASE}/Store_Config/${existing.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { config_value: second_language } }),
    })
  } else {
    await fetch(`${AT_BASE}/Store_Config`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { config_key: 'second_language', config_value: second_language } }),
    })
  }

  return NextResponse.json({ ok: true })
}
