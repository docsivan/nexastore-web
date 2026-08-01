import { NextRequest, NextResponse } from 'next/server'
import { readAiTable, asRecords } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

type HayaSEORec = {
  item_code?:        string
  slug?:             string
  meta_title?:       string
  meta_description?: string
  keywords?:         string
  schema_json?:      string
  internal_links?:   string
  created_at?:       string
}

type HayaInsightRec = {
  insight_type?: string
  insight_text?: string
  priority?:     string
  status?:       string
  created_at?:   string
}

type GSCRec = {
  query?:       string
  clicks?:      number
  impressions?: number
  position?:    number
  created_at?:  string
}

type TrendRec = {
  keyword?:    string
  trend_score?: number
  created_at?: string
}

async function fetchHayaSEO(): Promise<HayaSEORec[]> {
  try {
    return asRecords(await readAiTable('ai_seo', { limit: 500 })) as unknown as HayaSEORec[]
  } catch { return [] }
}

async function fetchGSC(): Promise<GSCRec[]> {
  try {
    return asRecords(
      await readAiTable('ai_search_console', { limit: 100, orderBy: 'impressions' })
    ) as unknown as GSCRec[]
  } catch { return [] }
}

async function fetchTrends(): Promise<TrendRec[]> {
  try {
    return asRecords(
      await readAiTable('ai_trends', { limit: 50, orderBy: 'trend_score' })
    ) as unknown as TrendRec[]
  } catch { return [] }
}

async function fetchSEOInsights(): Promise<HayaInsightRec[]> {
  try {
    return asRecords(
      await readAiTable('ai_insights', { limit: 100, match: { insight_type: 'cro_problem' } })
    ) as unknown as HayaInsightRec[]
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [seoRecords, gscRecords, trendRecords, insights] = await Promise.all([
    fetchHayaSEO(),
    fetchGSC(),
    fetchTrends(),
    fetchSEOInsights(),
  ])

  // SEO coverage
  const totalSEO        = seoRecords.length
  const withSchema      = seoRecords.filter(r => !!r.schema_json).length
  const withDescription = seoRecords.filter(r => (r.meta_description ?? '').length > 50).length
  const withKeywords    = seoRecords.filter(r => !!r.keywords).length
  const withInternalLinks = seoRecords.filter(r => !!r.internal_links).length

  // Top GSC queries by impressions
  const topQueries = gscRecords.slice(0, 10).map(r => ({
    query:       r.query ?? '',
    clicks:      r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position:    r.position ?? 0,
  }))

  // Low CTR opportunities (position ≤ 10, clicks low relative to impressions)
  const lowCTR = gscRecords
    .filter(r => (r.position ?? 99) <= 10 && (r.impressions ?? 0) > 50)
    .map(r => ({
      query:       r.query ?? '',
      clicks:      r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      position:    r.position ?? 0,
      ctr_pct:     r.impressions
        ? parseFloat(((r.clicks ?? 0) / r.impressions * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => a.ctr_pct - b.ctr_pct)
    .slice(0, 5)

  // Top trending keywords
  const topTrends = trendRecords.slice(0, 10).map(r => ({
    keyword:     r.keyword ?? '',
    trend_score: r.trend_score ?? 0,
  }))

  // Recent CRO insights
  const recentInsights = insights.slice(0, 5).map(r => ({
    insight_text: r.insight_text ?? '',
    priority:     r.priority ?? '',
    status:       r.status ?? '',
    created_at:   r.created_at ?? '',
  }))

  const response = NextResponse.json({
    coverage: {
      total_products_with_seo: totalSEO,
      with_schema:             withSchema,
      with_description:        withDescription,
      with_keywords:           withKeywords,
      with_internal_links:     withInternalLinks,
      schema_coverage_pct:     totalSEO > 0 ? parseFloat((withSchema / totalSEO * 100).toFixed(1)) : 0,
    },
    gsc: {
      top_queries: topQueries,
      low_ctr_opportunities: lowCTR,
    },
    trends:           topTrends,
    recent_insights:  recentInsights,
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
