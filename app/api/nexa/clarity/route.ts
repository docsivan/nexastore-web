import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'
import { PLATFORM_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

function nanoid(): string {
  return `cro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function getCRORecords() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const data  = await atList('Nexa_CRO', { since, limit: 50 })
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    page_url:    String(r.fields.page_url    ?? ''),
    signal_type: String(r.fields.signal_type ?? ''),
    session_count: Number(r.fields.session_count ?? 0),
    created_at:  String(r.fields.created_at  ?? ''),
  }))
}

async function writeInsight(insight: string, actionRequired: string) {
  await atCreate('Nexa_Insights', {
    insight_id:      nanoid(),
    insight_type:    'cro_problem',
    insight_text:    insight,
    action_required: actionRequired,
    priority:        '3',
    status:          'new',
    data_window:     'last_7_days',
  })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const systemPrompt = `You are a CRO specialist analysing user behaviour data for ${PLATFORM_NAME}.
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
        const check = await atList('Nexa_CRO', {
          limit: 1,
          match: {
            page_url: (r as { page_url: string }).page_url,
            insight_generated: false,
          },
        })
        const existing = check.records?.[0]
        if (existing) {
          await atPatch('Nexa_CRO', existing.id, { insight_generated: true })
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
