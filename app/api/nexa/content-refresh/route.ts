import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

const REFRESH_DAYS = 90

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function getStaleContent() {
  const cutoff  = new Date(Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const formula = encodeURIComponent(
    `AND({status}="published",OR(IS_BEFORE({last_updated},"${cutoff}"),{last_updated}=""))`
  )
  const res = await fetch(
    `${AT_BASE}/Haya_Content?filterByFormula=${formula}&sort[0][field]=last_updated&sort[0][direction]=asc&maxRecords=1`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  const r    = data.records?.[0]
  if (!r) return null
  return {
    record_id: r.id,
    content_id: String(r.fields.content_id ?? r.id),
    title:      String(r.fields.title       ?? ''),
    body:       String(r.fields.body        ?? ''),
    category:   String(r.fields.category    ?? ''),
    keywords:   String(r.fields.keywords    ?? ''),
  }
}

async function refreshBody(title: string, oldBody: string, category: string): Promise<string> {
  const systemPrompt = `You are an expert commerce content writer for NexaStore.
Refresh and improve this existing article. Keep the structure but:
- Update any outdated information
- Improve clarity and depth
- Ensure it reflects current best practices
- Keep it 900+ words
- Maintain or improve existing headings and FAQ section
Return ONLY the updated markdown body. No JSON wrapper.`

  return callSonnet(
    `Article title: ${title}\nCategory: ${category}\n\nCurrent article:\n${oldBody.slice(0, 3000)}`,
    systemPrompt
  )
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })

  try {
    const stale = await getStaleContent()
    if (!stale) {
      return NextResponse.json({ ok: true, message: `No content older than ${REFRESH_DAYS} days found` })
    }

    let newBody: string
    try {
      newBody = await refreshBody(stale.title, stale.body, stale.category)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: `Refresh writing failed: ${msg}` }, { status: 500 })
    }

    const wordCount = countWords(newBody)
    const now       = new Date().toISOString()

    await fetch(`${AT_BASE}/Haya_Content/${stale.record_id}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        fields: {
          body:         newBody,
          word_count:   wordCount,
          last_updated: now,
          status:       'published',
        },
      }),
    })

    return NextResponse.json({
      ok:         true,
      content_id: stale.content_id,
      title:      stale.title,
      word_count: wordCount,
      refreshed_at: now,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[content-refresh]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
