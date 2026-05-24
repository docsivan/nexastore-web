import { NextRequest, NextResponse } from 'next/server'
import { runCMOAgent, CMORecommendation } from '@/lib/nexa-agents'

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
  return `cmo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function atGet(path: string) {
  const res = await fetch(`${AT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
  })
  if (!res.ok) return { records: [] }
  return res.json()
}

async function fetchTrends() {
  const data = await atGet(
    `/Haya_Trends?maxRecords=10&sort[0][field]=trend_score&sort[0][direction]=desc`
  )
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    keyword:     String(r.fields.keyword     ?? ''),
    trend_score: Number(r.fields.trend_score ?? 0),
  }))
}

async function fetchRecentInsights() {
  const formula = encodeURIComponent(`{insight_type}="conversion_problem"`)
  const data = await atGet(
    `/Nexa_Insights?filterByFormula=${formula}&maxRecords=10&sort[0][field]=created_at&sort[0][direction]=desc`
  )
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    insight_text:    String(r.fields.insight_text    ?? ''),
    action_required: String(r.fields.action_required ?? ''),
    priority:        String(r.fields.priority        ?? ''),
  }))
}

async function fetchMemorySearchGaps() {
  const formula = encodeURIComponent(`{signal_type}="search"`)
  const data = await atGet(
    `/Haya_Memory?filterByFormula=${formula}&maxRecords=20&sort[0][field]=created_at&sort[0][direction]=desc`
  )
  return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    query:    String(r.fields.query    ?? r.fields.value   ?? ''),
    item_code: String(r.fields.item_code ?? ''),
  }))
}

async function fetchTopMarginProducts() {
  const fields = ['item_code', 'name', 'category', 'final_price', 'cost_price', 'haya_badge', 'display_order']
  const qs = fields.map(f => `fields[]=${encodeURIComponent(f)}`).join('&')
  const data = await atGet(`/Products?${qs}&maxRecords=100`)
  const records = (data.records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>
  return records
    .map(r => ({
      id:         r.id,
      item_code:  String(r.fields.item_code  ?? ''),
      name:       String(r.fields.name       ?? ''),
      category:   String(r.fields.category   ?? ''),
      price:      Number(r.fields.final_price ?? 0),
      cost:       Number(r.fields.cost_price  ?? 0),
      haya_badge: String(r.fields.haya_badge  ?? ''),
      display_order: Number(r.fields.display_order ?? 99),
    }))
    .filter(p => p.price > 0 && p.cost > 0)
    .map(p => ({ ...p, margin_pct: ((p.price - p.cost) / p.price * 100) }))
    .sort((a, b) => b.margin_pct - a.margin_pct)
    .slice(0, 5)
}

async function writeInsight(insight: CMORecommendation) {
  await fetch(`${AT_BASE}/Nexa_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        insight_id:      nanoid(),
        insight_type:    insight.insight_type,
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

async function patchProductBadge(itemCode: string, badge: string, displayOrder: number) {
  const formula = encodeURIComponent(`{item_code}="${itemCode}"`)
  const res = await fetch(`${AT_BASE}/Products?filterByFormula=${formula}&maxRecords=1`, {
    headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
  })
  if (!res.ok) return
  const data = await res.json()
  const record = data.records?.[0]
  if (!record) return
  await fetch(`${AT_BASE}/Products/${record.id}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { haya_badge: badge, display_order: displayOrder } }),
  })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const [trends, conversionInsights, searchGaps, topProducts] = await Promise.all([
      fetchTrends(),
      fetchRecentInsights(),
      fetchMemorySearchGaps(),
      fetchTopMarginProducts(),
    ])

    const agentData = {
      rising_trends:        trends,
      conversion_problems:  conversionInsights,
      search_gaps:          searchGaps,
      top_margin_products:  topProducts,
      date:                 new Date().toISOString().split('T')[0],
    }

    const recommendations = await runCMOAgent(agentData)

    // Write all 5 insights to Nexa_Insights
    await Promise.all(recommendations.slice(0, 5).map(r => writeInsight(r)))

    // Execute homepage feature recommendation immediately (index 1)
    const homepageRec = recommendations[1]
    if (homepageRec) {
      const text = homepageRec.insight_text + ' ' + homepageRec.action_required
      // Extract item_code pattern from recommendation text (e.g. IC-001, MD-002)
      const codeMatch = text.match(/\b([A-Z]{2,3}-\d{3})\b/)
      if (codeMatch) {
        const badgeMatch = text.match(/badge[:\s]+['"]?([A-Z\s]+)['"]?/i)
        const badge = badgeMatch ? badgeMatch[1].trim() : 'FEATURED'
        await patchProductBadge(codeMatch[1], badge, 1)
      }
    }

    // Flash sale recommendation (index 0): mark as pending_approval in insight
    // (No Haya_Promotions record yet — that's created when owner approves via /api/nexa/act)

    return NextResponse.json({ ok: true, recommendations, data_used: agentData })
  } catch (err) {
    console.error('[CMO] Error:', err)
    return NextResponse.json({ error: 'CMO agent failed' }, { status: 500 })
  }
}
