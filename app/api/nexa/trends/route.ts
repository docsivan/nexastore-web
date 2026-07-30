import { NextRequest, NextResponse } from 'next/server'
import { getStoreContext } from '@/lib/ai-context'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'

export const dynamic = 'force-dynamic'

const TRENDS_URL  = process.env.TRENDS_SERVER_URL ?? 'http://localhost:5001'

async function buildTopics(): Promise<Array<{ topic: string; category: string }>> {
  const storeCtx = await getStoreContext()
  return storeCtx.categories
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map(cat => ({ topic: `${cat} products`, category: cat.toLowerCase().replace(/\s+/g, '-') }))
}

interface TrendsResponse {
  keyword:         string
  geo:             string
  data:            Array<{ date: string; value: number }>
  trend_direction: 'rising' | 'falling' | 'stable'
  trend_value:     number
  error?:          string
}

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

async function fetchTrends(topic: string, geo = 'GLOBAL', weeks = 12): Promise<TrendsResponse> {
  const params = new URLSearchParams({ kw: topic, geo, weeks: String(weeks) })
  try {
    const res = await fetch(`${TRENDS_URL}/trends?${params}`, {
      cache:  'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { keyword: topic, geo, data: [], trend_direction: 'stable', trend_value: 0, error: `trends server ${res.status}: ${body}` }
    }
    return res.json()
  } catch (e) {
    return { keyword: topic, geo, data: [], trend_direction: 'stable', trend_value: 0, error: `Trends server offline: ${e}` }
  }
}

/** Refreshes this week's row for a topic, or creates one. */
async function upsertTrend(row: Record<string, unknown>) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const check = await atList('Haya_Trends', {
    limit: 1,
    orderBy: 'fetched_at',
    since: cutoff,
    match: { topic: row.topic },
  })
  const existing = check.records?.[0]
  if (existing) {
    await atPatch('Haya_Trends', existing.id, row)
  } else {
    await atCreate('Haya_Trends', row)
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Health-check the Python server first
  let serverOnline = false
  try {
    const ping = await fetch(`${TRENDS_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3_000) })
    serverOnline = ping.ok
  } catch {}

  if (!serverOnline) {
    return NextResponse.json({
      error:           'Trends server offline',
      hint:            'Run: python3 scripts/trends_server.py',
      trend_value:     0,
      trend_direction: 'stable',
    }, { status: 503 })
  }

  const TOPICS = await buildTopics()
  let upserted     = 0
  const errors: string[] = []
  const results: Array<{ topic: string; trend_value: number; trend_direction: string; error?: string }> = []

  for (const { topic, category } of TOPICS) {
    try {
      const t = await fetchTrends(topic)

      if (t.error === 'rate_limited') {
        errors.push(`${topic}: rate limited`)
        results.push({ topic, trend_value: 0, trend_direction: 'stable', error: 'rate_limited' })
        continue
      }

      const row: Record<string, unknown> = {
        topic,
        category,
        trend_value:           t.trend_value,
        trend_direction:       t.trend_direction,
        week_over_week_change: (() => {
          const vals = t.data.map(d => d.value)
          if (vals.length < 8) return 0
          const last4 = vals.slice(-4).reduce((s, v) => s + v, 0) / 4
          const prev4 = vals.slice(-8, -4).reduce((s, v) => s + v, 0) / 4
          return prev4 > 0 ? parseFloat(((last4 - prev4) / prev4 * 100).toFixed(1)) : 0
        })(),
        geo:             t.geo,
        related_queries: t.data.length > 0 ? `${t.data.length} weeks of data (${t.data[0]?.date} – ${t.data.at(-1)?.date})` : '',
        rising_queries:  '',
        weekly_data:     JSON.stringify(t.data),
        content_written: false,
        fetched_at:      new Date().toISOString().slice(0, 10),
      }

      await upsertTrend(row)
      upserted++
      results.push({ topic, trend_value: t.trend_value, trend_direction: t.trend_direction })

      // Respect Google Trends rate limits between topics
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${topic}: ${msg}`)
      results.push({ topic, trend_value: 0, trend_direction: 'stable', error: msg })
    }
  }

  return NextResponse.json({ ok: true, upserted, errors, results })
}
