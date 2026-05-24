import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest) {
  return !!req.headers.get('x-admin-pin')
}

type HayaSEORec = {
  fields: {
    item_code?:        string
    slug?:             string
    meta_title?:       string
    meta_description?: string
    keywords?:         string
    schema_json?:      string
    internal_links?:   string
    created_at?:       string
  }
}

type HayaInsightRec = {
  fields: {
    insight_type?: string
    insight_text?: string
    priority?:     string
    status?:       string
    created_at?:   string
  }
}

type GSCRec = {
  fields: {
    query?:       string
    clicks?:      number
    impressions?: number
    position?:    number
    created_at?:  string
  }
}

type TrendRec = {
  fields: {
    keyword?:    string
    trend_score?: number
    created_at?: string
  }
}

async function fetchHayaSEO(): Promise<HayaSEORec[]> {
  const res = await fetch(
    `${AT_BASE}/Nexa_SEO?maxRecords=500&sort[0][field]=created_at&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as HayaSEORec[]
}

async function fetchGSC(): Promise<GSCRec[]> {
  const res = await fetch(
    `${AT_BASE}/Haya_Search_Console?maxRecords=100&sort[0][field]=impressions&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as GSCRec[]
}

async function fetchTrends(): Promise<TrendRec[]> {
  const res = await fetch(
    `${AT_BASE}/Haya_Trends?maxRecords=50&sort[0][field]=trend_score&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as TrendRec[]
}

async function fetchSEOInsights(): Promise<HayaInsightRec[]> {
  const formula = encodeURIComponent(`{insight_type}="cro_problem"`)
  const res = await fetch(
    `${AT_BASE}/Nexa_Insights?filterByFormula=${formula}&maxRecords=10&sort[0][field]=created_at&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as HayaInsightRec[]
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const [seoRecords, gscRecords, trendRecords, insights] = await Promise.all([
    fetchHayaSEO(),
    fetchGSC(),
    fetchTrends(),
    fetchSEOInsights(),
  ])

  // SEO coverage
  const totalSEO        = seoRecords.length
  const withSchema      = seoRecords.filter(r => !!r.fields.schema_json).length
  const withDescription = seoRecords.filter(r => (r.fields.meta_description ?? '').length > 50).length
  const withKeywords    = seoRecords.filter(r => !!r.fields.keywords).length
  const withInternalLinks = seoRecords.filter(r => !!r.fields.internal_links).length

  // Top GSC queries by impressions
  const topQueries = gscRecords.slice(0, 10).map(r => ({
    query:       r.fields.query ?? '',
    clicks:      r.fields.clicks ?? 0,
    impressions: r.fields.impressions ?? 0,
    position:    r.fields.position ?? 0,
  }))

  // Low CTR opportunities (position ≤ 10, clicks low relative to impressions)
  const lowCTR = gscRecords
    .filter(r => (r.fields.position ?? 99) <= 10 && (r.fields.impressions ?? 0) > 50)
    .map(r => ({
      query:       r.fields.query ?? '',
      clicks:      r.fields.clicks ?? 0,
      impressions: r.fields.impressions ?? 0,
      position:    r.fields.position ?? 0,
      ctr_pct:     r.fields.impressions
        ? parseFloat(((r.fields.clicks ?? 0) / r.fields.impressions * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => a.ctr_pct - b.ctr_pct)
    .slice(0, 5)

  // Top trending keywords
  const topTrends = trendRecords.slice(0, 10).map(r => ({
    keyword:     r.fields.keyword ?? '',
    trend_score: r.fields.trend_score ?? 0,
  }))

  // Recent CRO insights
  const recentInsights = insights.slice(0, 5).map(r => ({
    insight_text: r.fields.insight_text ?? '',
    priority:     r.fields.priority ?? '',
    status:       r.fields.status ?? '',
    created_at:   r.fields.created_at ?? '',
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
