import { NextRequest, NextResponse } from 'next/server'
import { runCROAgent, CROFix } from '@/lib/nexa-agents'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  const adminPin   = req.headers.get('x-admin-pin')
  return cronSecret === process.env.CRON_SECRET || adminPin === process.env.ADMIN_PIN
}

function nanoid(): string {
  return `cro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function atGet(path: string) {
  const res = await fetch(`${AT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
  })
  if (!res.ok) return { records: [] }
  return res.json()
}

async function fetchCROSignals() {
  const formula = encodeURIComponent(
    `OR({signal_type}="rage_click",{signal_type}="dead_click")`
  )
  const data = await atGet(
    `/Nexa_CRO?filterByFormula=${formula}&maxRecords=100&sort[0][field]=session_count&sort[0][direction]=desc`
  )
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    page_url:     String(r.fields.page_url     ?? ''),
    signal_type:  String(r.fields.signal_type  ?? ''),
    session_count: Number(r.fields.session_count ?? 0),
    created_at:   String(r.fields.created_at   ?? ''),
  }))
}

async function fetchAbandonSignals() {
  const formula = encodeURIComponent(`{signal_type}="checkout_abandon"`)
  const data = await atGet(
    `/Haya_Memory?filterByFormula=${formula}&maxRecords=50`
  )
  // Group by page_url
  const grouped: Record<string, number> = {}
  for (const r of (data.records ?? []) as Array<{ fields: Record<string, unknown> }>) {
    const url = String(r.fields.page_url ?? r.fields.value ?? 'unknown')
    grouped[url] = (grouped[url] ?? 0) + 1
  }
  return Object.entries(grouped).map(([page_url, count]) => ({ page_url, count }))
}

async function fetchConversionRates() {
  const formula = encodeURIComponent(`{signal_type}="view"`)
  const data = await atGet(
    `/Haya_Memory?filterByFormula=${formula}&maxRecords=100`
  )
  const viewsByCode: Record<string, number> = {}
  for (const r of (data.records ?? []) as Array<{ fields: Record<string, unknown> }>) {
    const code = String(r.fields.item_code ?? '')
    if (code) viewsByCode[code] = (viewsByCode[code] ?? 0) + 1
  }
  return viewsByCode
}

async function writeInsight(insight: CROFix) {
  await fetch(`${AT_BASE}/Nexa_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        insight_id:      nanoid(),
        insight_type:    'cro_fix',
        insight_text:    insight.insight_text,
        action_required: insight.action_required,
        priority:        String(insight.priority ?? '3'),
        status:          'new',
        data_window:     'last_7_days',
        created_at:      new Date().toISOString().split('T')[0],
      },
    }),
  })
}

async function rewriteProductDescription(itemCode: string): Promise<string | null> {
  // Fetch current product
  const formula = encodeURIComponent(`{item_code}="${itemCode}"`)
  const res = await fetch(
    `${AT_BASE}/Products?filterByFormula=${formula}&maxRecords=1&fields[]=item_code&fields[]=name&fields[]=description&fields[]=category`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return null

  const { name, description, category } = record.fields as Record<string, string>
  const newDesc = await callSonnet(
    `Rewrite this product description to be more conversion-optimised for a NexaStore. Focus on product benefits and professional use. Max 200 words.\n\nProduct: ${name}\nCategory: ${category}\nCurrent description: ${description ?? '(none)'}`,
    'You are a product copywriter for NexaStore. Write concise, professional, conversion-focused descriptions. Return only the description text, no labels.'
  )

  // PATCH to Airtable
  await fetch(`${AT_BASE}/Products/${record.id}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { description: newDesc } }),
  })

  return newDesc
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const [croSignals, abandonSignals, conversionRates] = await Promise.all([
      fetchCROSignals(),
      fetchAbandonSignals(),
      fetchConversionRates(),
    ])

    // Filter pages with >10 sessions (high-signal)
    const highSignalPages = croSignals.filter((s: { session_count: number }) => s.session_count > 10)

    const agentData = {
      high_signal_pages:  highSignalPages,
      abandon_signals:    abandonSignals,
      conversion_rates:   conversionRates,
      date:               new Date().toISOString().split('T')[0],
    }

    const fixes = await runCROAgent(agentData)

    const descriptionRewrites: string[] = []
    const pendingApproval: CROFix[] = []

    for (const fix of fixes) {
      await writeInsight(fix)

      const actionLower = (fix.action_required ?? '').toLowerCase()
      const textLower   = (fix.insight_text    ?? '').toLowerCase()

      if (actionLower.includes('description') || textLower.includes('description rewrite')) {
        // Extract item_code from recommendation
        const codeMatch = (fix.insight_text + ' ' + fix.action_required).match(/\b([A-Z]{2,3}-\d{3})\b/)
        if (codeMatch) {
          await rewriteProductDescription(codeMatch[1])
          descriptionRewrites.push(codeMatch[1])
        } else {
          pendingApproval.push(fix)
        }
      } else {
        pendingApproval.push(fix)
      }
    }

    return NextResponse.json({
      ok:                  true,
      fixes_generated:     fixes.length,
      description_rewrites: descriptionRewrites,
      pending_approval:    pendingApproval.length,
    })
  } catch (err) {
    console.error('[CRO] Error:', err)
    return NextResponse.json({ error: 'CRO agent failed' }, { status: 500 })
  }
}
