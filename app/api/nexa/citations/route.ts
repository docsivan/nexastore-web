import { NextRequest, NextResponse } from 'next/server'
import { atCreate } from '@/lib/ai-tables'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

const BRAND_QUERIES = [
  'NexaStore skincare products online',
  'derma cosmetics supplier',
  'beauty supplies online store',
  'skincare products ecommerce',
  'NexaStore AI commerce platform',
]

interface SerpResult {
  query:    string
  cited:    boolean
  position: number
  context:  string
  platform: string
}

async function checkCitation(query: string): Promise<SerpResult> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { query, cited: false, position: 0, context: `DDG error ${res.status}`, platform: 'duckduckgo' }
    const data = await res.json()

    const hasAbstract = data.AbstractText && String(data.AbstractText).length > 0
    const hasTopics   = Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0
    const found       = hasAbstract || hasTopics
    const source      = data.AbstractSource ?? (hasTopics ? 'Web' : '')
    const context     = data.AbstractText
      ? String(data.AbstractText).slice(0, 200)
      : (data.RelatedTopics?.[0]?.Text ?? '')

    const cited = found && (
      String(context).toLowerCase().includes('nexastore') ||
      String(source).toLowerCase().includes('nexastore')
    )

    return { query, cited, position: cited ? 1 : 0, context: String(context).slice(0, 200), platform: 'duckduckgo' }
  } catch (err) {
    return { query, cited: false, position: 0, context: String(err), platform: 'duckduckgo' }
  }
}

async function writeCitationRecord(result: SerpResult): Promise<void> {
  await atCreate('Haya_Citations', {
    query:      result.query,
    platform:   result.platform,
    cited:      result.cited,
    position:   result.position,
    context:    result.context,
    fetched_at: new Date().toISOString().slice(0, 10),
  })
}

async function writeInsight(insight: { insight_type: string; insight_text: string; action_required: string; priority: string }): Promise<void> {
  await atCreate('Nexa_Insights', {
    insight_type:    insight.insight_type,
    insight_text:    insight.insight_text,
    action_required: insight.action_required,
    priority:        insight.priority,
    source:          'citations',
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

  const systemPrompt = `You are an AEO/GEO strategist for NexaStore, a global AI commerce platform.
Return only a valid JSON array of insight objects with no markdown, no code fences.
Each object: { "insight_type": "geo_gap", "insight_text": string, "action_required": string, "priority": "high"|"medium"|"low" }`

  const userPrompt = `Citation audit results for NexaStore (nexastore.io):

Cited (${cited.length}/${results.length}):
${cited.map(r => `- "${r.query}" — position ${r.position}: ${r.context}`).join('\n') || 'None'}

Not cited (${missing.length}/${results.length}):
${missing.map(r => `- "${r.query}" — context: ${r.context}`).join('\n') || 'None'}

Generate 3-5 actionable GEO/AEO gap insights to improve NexaStore's presence in AI overviews and search results.`

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
