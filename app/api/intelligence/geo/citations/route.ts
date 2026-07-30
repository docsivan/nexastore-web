import { NextRequest, NextResponse } from 'next/server'
import { readAiTable, asRecords } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await readAiTable('ai_citations', { limit: 50, orderBy: 'fetched_at' })
    const citations = asRecords(rows).map((r: { fields: Record<string, unknown> }) => ({
      query:      String(r.fields.query      ?? ''),
      platform:   String(r.fields.platform   ?? 'google'),
      cited:      Boolean(r.fields.cited),
      position:   Number(r.fields.position   ?? 0),
      context:    String(r.fields.context    ?? ''),
      fetched_at: String(r.fields.fetched_at ?? ''),
    }))
    return NextResponse.json({ citations }, { headers: { 'Cache-Control': 's-maxage=300' } })
  } catch (e) {
    return NextResponse.json({ citations: [], error: String(e) })
  }
}
