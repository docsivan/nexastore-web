import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY  = process.env.AIRTABLE_API_KEY!
const BASE_ID  = process.env.AIRTABLE_BASE_ID!
const AT_BASE  = `https://api.airtable.com/v0/${BASE_ID}`
const CSE_KEY  = process.env.GOOGLE_CSE_KEY ?? ''
const CSE_ID   = process.env.GOOGLE_CSE_ID  ?? ''

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  const adminPin   = req.headers.get('x-admin-pin')
  return cronSecret === process.env.CRON_SECRET || !!adminPin
}

const BRAND_QUERIES = [
  'Hayat Supplies Oman medical',
  'best medical supplies supplier Oman Muscat',
  'infection control supplies Oman clinic',
  'dental supplies Muscat Oman distributor',
  'PPE sterilization supplies Oman hospital',
]

interface SerpResult {
  query:    string
  cited:    boolean
  position: number
  context:  string
  platform: string
}

async function checkCitation(query: string): Promise<SerpResult> {
  if (!CSE_KEY || !CSE_ID) {
    return { query, cited: false, position: 0, context: 'GOOGLE_CSE_KEY or GOOGLE_CSE_ID not configured', platform: 'google' }
  }
  try {
    const params = new URLSearchParams({
      key: CSE_KEY,
      cx:  CSE_ID,
      q:   query,
      gl:  'om',
      num: '10',
    })
    const res = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params}`, { cache: 'no-store' })
    if (!res.ok) return { query, cited: false, position: 0, context: `CSE error ${res.status}`, platform: 'google' }
    const data = await res.json()

    const results: Array<{ title?: string; snippet?: string; link?: string }> = data.items ?? []
    const idx = results.findIndex(
      r => (r.link ?? '').includes('hayatsupplies') || (r.title ?? '').toLowerCase().includes('hayat')
    )
    if (idx !== -1) {
      const r = results[idx]
      return {
        query,
        cited:    true,
        position: idx + 1,
        context:  r.snippet ?? r.title ?? '',
        platform: 'google',
      }
    }
    const topSnippet = results[0]?.snippet ?? results[0]?.title ?? ''
    return { query, cited: false, position: 0, context: topSnippet, platform: 'google' }
  } catch (err) {
    return { query, cited: false, position: 0, context: String(err), platform: 'google' }
  }
}

async function writeCitationRecord(result: SerpResult): Promise<void> {
  await fetch(`${AT_BASE}/Haya_Citations`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [{
        fields: {
          query:      result.query,
          platform:   result.platform,
          cited:      result.cited,
          position:   result.position,
          context:    result.context,
          fetched_at: new Date().toISOString().slice(0, 10),
        },
      }],
    }),
  })
}

async function writeInsight(insight: { insight_type: string; insight_text: string; action_required: string; priority: string }): Promise<void> {
  await fetch(`${AT_BASE}/Haya_Insights`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [{
        fields: {
          insight_type:    insight.insight_type,
          insight_text:    insight.insight_text,
          action_required: insight.action_required,
          priority:        insight.priority,
          created_at:      new Date().toISOString(),
          source:          'citations',
        },
      }],
    }),
  })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: SerpResult[] = []
  for (const query of BRAND_QUERIES) {
    const r = await checkCitation(query)
    results.push(r)
    await writeCitationRecord(r)
  }

  const cited   = results.filter(r => r.cited)
  const missing = results.filter(r => !r.cited)

  const systemPrompt = `You are an AEO/GEO strategist for Hayat Supplies, a medical supplies distributor in Oman.
Return only a valid JSON array of insight objects with no markdown, no code fences.
Each object: { "insight_type": "geo_gap", "insight_text": string, "action_required": string, "priority": "high"|"medium"|"low" }`

  const userPrompt = `Citation audit results for Hayat Supplies (hayatsupplies.com):

Cited in Google (${cited.length}/${results.length}):
${cited.map(r => `- "${r.query}" — position ${r.position}: ${r.context}`).join('\n') || 'None'}

Not cited (${missing.length}/${results.length}):
${missing.map(r => `- "${r.query}" — top result: ${r.context}`).join('\n') || 'None'}

Generate 3-5 actionable GEO/AEO gap insights to improve Hayat Supplies' presence in AI overviews and Google results for Oman medical supply searches.`

  let insights: Array<{ insight_type: string; insight_text: string; action_required: string; priority: string }> = []
  try {
    const raw = await callSonnet(userPrompt, systemPrompt)
    const cleaned = raw.replace(/```json|```/g, '').trim()
    insights = JSON.parse(cleaned)
    for (const insight of insights) {
      await writeInsight(insight)
    }
  } catch {
    // Non-fatal — citation records already written
  }

  return NextResponse.json({
    checked:  results.length,
    cited:    cited.length,
    missing:  missing.length,
    insights: insights.length,
    results,
  })
}
