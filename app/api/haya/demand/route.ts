import { NextRequest, NextResponse } from 'next/server'
import { runDemandAgent, DemandForecast } from '@/lib/haya-agents'

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
  return `dem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type ItemLine = { item_code?: string; quantity?: number; category?: string }

async function fetchNinetyDayOrders() {
  const since   = new Date(Date.now() - 90 * 86400000).toISOString()
  const formula = encodeURIComponent(
    `AND(IS_AFTER({created_at},"${since}"),{payment_status}="paid")`
  )
  const res = await fetch(
    `${AT_BASE}/Orders?filterByFormula=${formula}&maxRecords=500&fields[]=items&fields[]=created_at`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as Array<{ fields: { items?: string; created_at?: string } }>
}

async function fetchProductCategories(): Promise<Record<string, string>> {
  const res = await fetch(
    `${AT_BASE}/Products?fields[]=item_code&fields[]=category&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return {}
  const map: Record<string, string> = {}
  for (const r of ((await res.json()).records ?? []) as Array<{ fields: { item_code?: string; category?: string } }>) {
    if (r.fields.item_code) map[r.fields.item_code] = r.fields.category ?? 'Other'
  }
  return map
}

async function fetchTrends() {
  const res = await fetch(
    `${AT_BASE}/Haya_Trends?maxRecords=20&sort[0][field]=trend_score&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    keyword:     String(r.fields.keyword     ?? ''),
    trend_score: Number(r.fields.trend_score ?? 0),
    created_at:  String(r.fields.created_at  ?? ''),
  }))
}

async function fetchPatternInsights() {
  const formula = encodeURIComponent(
    `OR({insight_type}="demand_forecast",{insight_type}="inventory_alert")`
  )
  const res = await fetch(
    `${AT_BASE}/Haya_Insights?filterByFormula=${formula}&maxRecords=10&sort[0][field]=created_at&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []).map((r: { fields: Record<string, unknown> }) => ({
    insight_text: String(r.fields.insight_text ?? ''),
    insight_type: String(r.fields.insight_type ?? ''),
    created_at:   String(r.fields.created_at   ?? ''),
  }))
}

async function writeInsight(forecast: DemandForecast) {
  await fetch(`${AT_BASE}/Haya_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        insight_id:      nanoid(),
        insight_type:    'demand_forecast',
        insight_text:    forecast.insight_text,
        action_required: forecast.action_required,
        priority:        String(forecast.priority ?? '3'),
        status:          'new',
        data_window:     'last_90_days',
        created_at:      new Date().toISOString().split('T')[0],
      },
    }),
  })
}

async function writeInventoryAlert(category: string, forecast: DemandForecast) {
  await fetch(`${AT_BASE}/Haya_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        insight_id:      nanoid(),
        insight_type:    'inventory_alert',
        insight_text:    `Rising demand forecast for ${category}: ${forecast.trend}. Pre-stock recommended.`,
        action_required: forecast.action_required,
        priority:        '2',
        status:          'new',
        data_window:     'forecast_30_days',
        created_at:      new Date().toISOString().split('T')[0],
      },
    }),
  })
}

function weekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  try {
    const [orders, catMap, trends, patternInsights] = await Promise.all([
      fetchNinetyDayOrders(),
      fetchProductCategories(),
      fetchTrends(),
      fetchPatternInsights(),
    ])

    // Group units sold by category by week
    const catWeekly: Record<string, Record<number, number>> = {}
    for (const order of orders) {
      const ts = order.fields.created_at ? new Date(order.fields.created_at) : new Date()
      const wk = weekNumber(ts)
      try {
        const items: ItemLine[] = JSON.parse(order.fields.items ?? '[]')
        for (const item of items) {
          const code = item.item_code ?? ''
          const cat  = catMap[code] ?? item.category ?? 'Other'
          const qty  = item.quantity ?? 1
          if (!catWeekly[cat]) catWeekly[cat] = {}
          catWeekly[cat][wk] = (catWeekly[cat][wk] ?? 0) + qty
        }
      } catch {}
    }

    // Summarise each category: last 4 weeks vs previous 4 weeks
    const now = new Date()
    const currentWeek = weekNumber(now)
    const catSummary = Object.entries(catWeekly).map(([category, weekly]) => {
      const recentWeeks = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek]
      const prevWeeks   = [currentWeek - 7, currentWeek - 6, currentWeek - 5, currentWeek - 4]
      const recentTotal = recentWeeks.reduce((s, w) => s + (weekly[w] ?? 0), 0)
      const prevTotal   = prevWeeks.reduce((s,   w) => s + (weekly[w] ?? 0), 0)
      const growthPct   = prevTotal > 0 ? ((recentTotal - prevTotal) / prevTotal * 100) : 0
      return { category, recent_4w: recentTotal, prev_4w: prevTotal, growth_pct: parseFloat(growthPct.toFixed(1)) }
    }).sort((a, b) => b.growth_pct - a.growth_pct)

    const agentData = {
      category_trends:   catSummary,
      search_trends:     trends,
      pattern_insights:  patternInsights,
      current_date:      now.toISOString().split('T')[0],
      current_week:      currentWeek,
    }

    const forecasts = await runDemandAgent(agentData)

    // Write all forecasts
    await Promise.all(forecasts.map(f => writeInsight(f)))

    // Write additional inventory_alert for rising >20% categories
    const risingForecasts = forecasts.filter(f =>
      (f.trend ?? '').toLowerCase().includes('rising') ||
      catSummary.find(c => c.category === f.category && c.growth_pct > 20)
    )
    if (risingForecasts.length > 0) {
      await Promise.all(risingForecasts.map(f => writeInventoryAlert(f.category, f)))
    }

    // Seasonal pre-warnings: check if any forecast mentions peak < 6 weeks
    const urgentForecasts = forecasts.filter(f =>
      (f.insight_text ?? '').toLowerCase().match(/within [1-5] week|next [1-5] week|peak in [1-5]/)
    )
    for (const f of urgentForecasts) {
      await fetch(`${AT_BASE}/Haya_Insights`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            insight_id:      nanoid(),
            insight_type:    'seasonal_warning',
            insight_text:    `⚠️ SEASONAL PEAK WARNING: ${f.insight_text}`,
            action_required: f.action_required,
            priority:        '1',
            status:          'new',
            data_window:     'forecast_6_weeks',
            created_at:      now.toISOString().split('T')[0],
          },
        }),
      })
    }

    return NextResponse.json({
      ok:                 true,
      forecasts_written:  forecasts.length,
      rising_categories:  risingForecasts.length,
      seasonal_warnings:  urgentForecasts.length,
      category_summary:   catSummary,
    })
  } catch (err) {
    console.error('[Demand] Error:', err)
    return NextResponse.json({ error: 'Demand agent failed' }, { status: 500 })
  }
}
