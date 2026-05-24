import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  const adminPin   = req.headers.get('x-admin-pin')
  return cronSecret === process.env.CRON_SECRET || !!adminPin
}

function nanoid(): string {
  return `cro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function getCRORecords() {
  const since   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const formula = encodeURIComponent(`IS_AFTER({created_at},"${since}")`)
  const res     = await fetch(
    `${AT_BASE}/Haya_CRO?filterByFormula=${formula}&maxRecords=50`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    page_url:    String(r.fields.page_url    ?? ''),
    signal_type: String(r.fields.signal_type ?? ''),
    session_count: Number(r.fields.session_count ?? 0),
    created_at:  String(r.fields.created_at  ?? ''),
  }))
}

async function writeInsight(insight: string, actionRequired: string) {
  await fetch(`${AT_BASE}/Haya_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      fields: {
        insight_id:      nanoid(),
        insight_type:    'cro_problem',
        insight_text:    insight,
        action_required: actionRequired,
        priority:        '3',
        status:          'new',
        data_window:     'last_7_days',
        created_at:      new Date().toISOString().split('T')[0],
      },
    }),
  })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })

  try {
    const records = await getCRORecords()

    if (records.length === 0) {
      return NextResponse.json({ ok: true, message: 'No CRO data in last 7 days' })
    }

    const summary = records
      .map((r: { page_url: string; signal_type: string; session_count: number }) =>
        `- ${r.page_url} | signal: ${r.signal_type} | sessions: ${r.session_count}`
      )
      .join('\n')

    const systemPrompt = `You are a CRO (conversion rate optimisation) specialist analysing user behaviour data for Hayat Supplies, a healthcare procurement platform in Oman.
Review the signals and identify concrete UX or conversion problems.
Return ONLY valid JSON: {"insight":"...(max 200 chars)","action_required":"...(max 150 chars)"}
Focus on: high-exit pages, low-conversion patterns, friction points, mobile issues.`

    const raw  = await callSonnet(
      `CRO signals from the last 7 days:\n${summary}`,
      systemPrompt
    )

    let insight        = raw
    let actionRequired = 'Review CRO signals manually'

    try {
      const clean  = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(clean)
      insight        = parsed.insight        ?? raw.slice(0, 200)
      actionRequired = parsed.action_required ?? actionRequired
    } catch {}

    await writeInsight(insight, actionRequired)

    // Mark records as insight_generated
    for (const r of records.slice(0, 10)) {
      try {
        const formula  = encodeURIComponent(`AND({page_url}="${(r as { page_url: string }).page_url}",{insight_generated}=FALSE())`)
        const checkRes = await fetch(`${AT_BASE}/Haya_CRO?filterByFormula=${formula}&maxRecords=1`, {
          headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
        })
        const checkData = await checkRes.json()
        const existing  = checkData.records?.[0]
        if (existing) {
          await fetch(`${AT_BASE}/Haya_CRO/${existing.id}`, {
            method:  'PATCH',
            headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ fields: { insight_generated: true } }),
          })
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, records_analysed: records.length, insight })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[clarity-cro]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
