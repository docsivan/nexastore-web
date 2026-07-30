import { NextRequest, NextResponse } from 'next/server'
import { atGetPath, atList, atCreate, atPatch } from '@/lib/ai-tables'
import { callSonnet } from '@/lib/claude'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


/** Thin alias so the atFetch(...) call sites below stay unchanged. */
async function atFetch(path: string) {
  return atGetPath(path)
}

async function writeInsight(
  insightId:      string,
  pkg:            string,
  insightType:    string,
  insight:        string,
  actionRequired: string,
  priority:       number,
  itemCode?:      string,
  customerId?:    string,
) {
  await atCreate('Nexa_Insights', {
    insight_id:      insightId,
    package:         pkg,
    insight_type:    insightType,
    insight_text:    insight.slice(0, 500),
    action_required: actionRequired.slice(0, 300),
    priority:        String(priority),
    status:          'new',
    ...(itemCode   && { item_code:   itemCode }),
    ...(customerId && { customer_id: customerId }),
  })
}

function parseClaudeJson(raw: string): { insight: string; action_required: string } {
  const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(stripped)
    if (parsed.insight) return { insight: parsed.insight, action_required: parsed.action_required ?? '' }
  } catch {}
  return { insight: raw.trim(), action_required: '' }
}

let SYSTEM_PROMPT = 'You are the AI business intelligence engine. Your insights are brief (2-3 sentences), specific, and actionable. No generic advice. Return ONLY valid JSON — no markdown, no explanation.'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isAdmin    = req.headers.get('x-admin-pin') === process.env.ADMIN_PIN

  if (!isAdmin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storeCtx = await getStoreContext()
  SYSTEM_PROMPT  = `You are the AI business intelligence engine for ${storeCtx.storeName}. Your insights are brief (2-3 sentences), specific, and actionable. No generic advice. Return ONLY valid JSON — no markdown, no explanation.`

  // ── Fetch signals (30 days) ────────────────────────────────────────────────
  const since30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sigFormula = encodeURIComponent(`IS_AFTER({created_at},"${since30}")`)
  const sigRes   = await atFetch(`/Haya_Memory?filterByFormula=${sigFormula}&maxRecords=200&sort[0][field]=created_at&sort[0][direction]=desc`)
  const signals: Record<string, unknown>[] = (sigRes.records ?? []).map(
    (r: { fields: Record<string, unknown> }) => r.fields
  )

  // ── Fetch orders (90 days for patterns) ───────────────────────────────────
  const since90   = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const ordFormula = encodeURIComponent(
    `AND({payment_status}='paid',IS_AFTER({created_at},"${since90}"))`
  )
  const ordRes  = await atFetch(`/Orders?filterByFormula=${ordFormula}&maxRecords=200`)
  const orders: Record<string, unknown>[] = (ordRes.records ?? []).map(
    (r: { fields: Record<string, unknown> }) => r.fields
  )

  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const created: string[] = []

  if (signals.length > 0) {
    const searches  = signals.filter(s => s.signal_type === 'search').map(s => s.query).filter(Boolean) as string[]
    const views     = signals.filter(s => s.signal_type === 'view').map(s => s.item_code).filter(Boolean) as string[]
    const cartAdds  = signals.filter(s => s.signal_type === 'add_to_cart')
    const abandons  = signals.filter(s => s.signal_type === 'abandon')

    const freq = (arr: string[]) =>
      Object.entries(arr.reduce((acc: Record<string, number>, v) => { acc[v] = (acc[v] || 0) + 1; return acc }, {}))
        .sort(([, a], [, b]) => b - a).slice(0, 10).map(([v, n]) => `${v} (${n}x)`)

    const topSearches = freq(searches)
    const topViews    = freq(views)
    const topCarts    = freq(cartAdds.map(s => s.item_code as string).filter(Boolean))

    const JSON_SUFFIX = ' Return ONLY JSON: {"insight":"...","action_required":"..."}'

    const packages = [
      {
        pkg:         'search_gaps',
        insightType: 'search_gap',
        priority:    4,
        skip:        searches.length === 0,
        prompt:      `${storeCtx.storeName} customer searches (last 30 days): ${topSearches.join(', ')}. Identify the top 2-3 products we should add or promote to fill this demand. Be specific with product names.${JSON_SUFFIX}`,
      },
      {
        pkg:         'hot_products',
        insightType: 'hot_products',
        priority:    3,
        skip:        views.length === 0,
        prompt:      `Most viewed: ${topViews.join(', ')}. Most cart-added: ${topCarts.join(', ')}. Suggest 2-3 specific merchandising actions (feature on homepage, bundle deal, restock).${JSON_SUFFIX}`,
      },
      {
        pkg:         'abandon_risk',
        insightType: 'conversion_problem',
        priority:    5,
        skip:        false,
        prompt:      `${abandons.length} cart abandonment events (last 30 days). Cart totals: ${abandons.slice(0, 10).map(s => s.cart_total ? `${storeCtx.currency} ${Number(s.cart_total).toFixed(2)}` : 'unknown').join(', ')}. What is the most likely cause and single most important action to reduce it?${JSON_SUFFIX}`,
      },
      {
        pkg:         'demand_forecast',
        insightType: 'demand_forecast',
        priority:    2,
        skip:        false,
        prompt:      `Signals: ${searches.length} searches, ${views.length} views, ${cartAdds.length} cart adds, ${abandons.length} abandons (last 30 days). Which category should ${storeCtx.storeName} prioritise for restocking and marketing this week?${JSON_SUFFIX}`,
      },
    ]

    for (let i = 0; i < packages.length; i++) {
      const { pkg, insightType, priority, skip, prompt } = packages[i]
      if (skip) continue
      try {
        const raw                        = await callSonnet(prompt, SYSTEM_PROMPT)
        const { insight, action_required } = parseClaudeJson(raw)
        const insightId                  = `INSIGHT-${today}-${String(i + 1).padStart(3, '0')}`
        await writeInsight(insightId, pkg, insightType, insight, action_required, priority)
        created.push(insightId)
      } catch (e: unknown) {
        console.error(`[analyse] ${pkg} failed:`, e instanceof Error ? e.message : e)
      }
    }
  }

  // ── Package 5: Patterns (needs orders data) ───────────────────────────────
  if (orders.length >= 5) {
    // Reorder intervals per customer
    const ordersByPhone: Record<string, string[]> = {}
    for (const o of orders) {
      const phone = o.phone as string ?? ''
      const date  = o.created_at as string ?? ''
      if (phone && date) {
        if (!ordersByPhone[phone]) ordersByPhone[phone] = []
        ordersByPhone[phone].push(date)
      }
    }
    const intervals: number[] = []
    for (const dates of Object.values(ordersByPhone)) {
      if (dates.length < 2) continue
      const sorted = [...dates].sort()
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000
        intervals.push(Math.round(diff))
      }
    }
    const avgReorderDays = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0

    // Product affinity
    const pairCounts: Record<string, number> = {}
    for (const o of orders) {
      try {
        const items = JSON.parse(o.items as string ?? '[]') as Array<{ item_code?: string }>
        const codes = items.map(i => i.item_code).filter(Boolean) as string[]
        for (let i = 0; i < codes.length; i++) {
          for (let j = i + 1; j < codes.length; j++) {
            const pair = [codes[i], codes[j]].sort().join('+')
            pairCounts[pair] = (pairCounts[pair] || 0) + 1
          }
        }
      } catch {}
    }
    const topPairs = Object.entries(pairCounts)
      .filter(([, n]) => n >= 3).sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([pair, n]) => `${pair} (${n} times)`)

    // Peak order day
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]
    for (const o of orders) {
      const d = o.created_at as string
      if (d) dayCounts[new Date(d).getDay()]++
    }
    const dayNames  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const peakDay   = dayNames[dayCounts.indexOf(Math.max(...dayCounts))]

    // Month-over-month order count
    const now         = new Date()
    const thisMonthN  = orders.filter(o => { const d = o.created_at as string; return d && new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear() }).length
    const lastMonthN  = orders.filter(o => { const d = o.created_at as string; const dt = new Date(d); return d && dt.getMonth() === (now.getMonth() - 1 + 12) % 12 }).length
    const momGrowth   = lastMonthN > 0 ? Math.round((thisMonthN - lastMonthN) / lastMonthN * 100) : 0

    const patternData = {
      total_orders_90d:   orders.length,
      avg_reorder_days:   avgReorderDays,
      top_product_pairs:  topPairs,
      peak_order_day:     peakDay,
      this_month_orders:  thisMonthN,
      last_month_orders:  lastMonthN,
      mom_growth_pct:     momGrowth,
    }

    const patternPrompt = `Analyze these 90-day patterns for ${storeCtx.storeName} and return the 3 most actionable business insights as a JSON array. Each object: {"insight_type":"pattern","insight":"...","action_required":"...","priority":1-5}\n\nData: ${JSON.stringify(patternData)}`

    try {
      const raw     = await callSonnet(patternPrompt, SYSTEM_PROMPT)
      const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      let patterns: Array<{ insight_type?: string; insight?: string; action_required?: string; priority?: number }> = []
      try { patterns = JSON.parse(stripped); if (!Array.isArray(patterns)) patterns = [] } catch {}

      for (let j = 0; j < Math.min(patterns.length, 3); j++) {
        const p         = patterns[j]
        const insightId = `INSIGHT-${today}-P${j + 1}`
        await writeInsight(insightId, 'pattern', 'pattern', p.insight ?? '', p.action_required ?? '', p.priority ?? 2)
        created.push(insightId)
      }
    } catch (e: unknown) {
      console.error('[analyse] patterns failed:', e instanceof Error ? e.message : e)
    }
  }

  
  // ── CONVERSATION LEARNING ─────────────────────────────────────────
  // Fetch unanalysed conversations from last 7 days
  const convoSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const convoData = await atList('Haya_Conversations', {
    limit: 50,
    since: convoSince,
    match: { analysed: false },
  })
  const conversations = convoData.records ?? []

  if (conversations.length > 0) {
    const transcriptBlock = conversations
      .map((r: any) => `---\nOutcome: ${r.fields.outcome}\n${r.fields.transcript}\n---`)
      .join('\n')

    const convoPrompt = `You are the AI learning engine for ${storeCtx.storeName}.
Analyse these ${conversations.length} visitor conversations.
Identify:
1. Questions the assistant answered poorly or avoided
2. Topics visitors asked about that had no good answer
3. Patterns in conversations that did NOT convert vs those that DID
4. Products or categories frequently asked about

Return JSON array of insights:
[{ insight_type: 'chat_gap', insight_text: '...', action_required: '...', priority: 'high|medium|low' }]

CONVERSATIONS:
${transcriptBlock}`

    const convoInsights = await callSonnet(convoPrompt, `You are the AI intelligence engine for ${storeCtx.storeName}. Return valid JSON only.`)
    try {
      const parsed = JSON.parse(convoInsights.replace(/```json|```/g, '').trim())
      for (const insight of parsed.slice(0, 5)) {
        await atCreate('Nexa_Insights', {
          insight_id:      `INSIGHT-CHAT-${Date.now()}`,
          insight_type:    insight.insight_type ?? 'chat_gap',
          insight_text:    insight.insight_text,
          action_required: insight.action_required,
          priority:        insight.priority ?? 'medium',
          status:          'new',
          data_window:     'Last 7 days conversations',
        })
      }
      // Mark conversations as analysed
      for (const r of conversations) {
        await atPatch('Haya_Conversations', r.id, { analysed: true })
      }
    } catch (e) {
      console.error('[analyse] convo parse failed:', e)
    }
  }
  // ──────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true, insights: created.length, ids: created })
}
