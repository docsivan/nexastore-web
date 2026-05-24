import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!

const META_TABLES_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`
const HEADERS = {
  Authorization:  `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

const TABLE_NAME = 'Haya_Cron_Log'

// Field definitions matching the required schema.
// cron_name is listed first so Airtable uses it as the primary field.
const TABLE_FIELDS = [
  { name: 'cron_name',         type: 'singleLineText' },
  { name: 'status',            type: 'singleLineText' },
  {
    name:    'records_processed',
    type:    'number',
    options: { precision: 0 },
  },
  { name: 'error_message', type: 'singleLineText' },
  { name: 'run_at',        type: 'singleLineText' },
]

export async function GET() {
  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY or AIRTABLE_BASE_ID not set' }, { status: 500 })
  }

  // 1. Check whether the table already exists
  const listRes = await fetch(META_TABLES_URL, { headers: HEADERS, cache: 'no-store' })
  if (!listRes.ok) {
    const body = await listRes.text()
    return NextResponse.json(
      { error: `Failed to list tables: ${listRes.status}`, detail: body },
      { status: 500 }
    )
  }

  const listData = await listRes.json()
  const existing = (listData.tables ?? []).find(
    (t: { name: string }) => t.name === TABLE_NAME
  )

  if (existing) {
    return NextResponse.json({
      ok:      true,
      created: false,
      message: `Table "${TABLE_NAME}" already exists (id: ${existing.id})`,
      tableId: existing.id,
    })
  }

  // 2. Create the table
  const createRes = await fetch(META_TABLES_URL, {
    method:  'POST',
    headers: HEADERS,
    body: JSON.stringify({
      name:        TABLE_NAME,
      description: 'Audit log for Haya data enrichment cron jobs',
      fields:      TABLE_FIELDS,
    }),
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    return NextResponse.json(
      { error: `Failed to create table: ${createRes.status}`, detail: body },
      { status: 500 }
    )
  }

  const created = await createRes.json()
  return NextResponse.json({
    ok:      true,
    created: true,
    message: `Table "${TABLE_NAME}" created successfully`,
    tableId: created.id,
    fields:  TABLE_FIELDS.map(f => f.name),
  })
}
