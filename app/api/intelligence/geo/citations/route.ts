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
    const citations = asRecords(rows).map((r: Record<string, unknown>) => ({
      query:      String(r.query      ?? ''),
      platform:   String(r.platform   ?? 'google'),
      cited:      Boolean(r.cited),
      position:   Number(r.position   ?? 0),
      context:    String(r.context    ?? ''),
      fetched_at: String(r.fetched_at ?? ''),
    }))
    return NextResponse.json({ citations }, { headers: { 'Cache-Control': 's-maxage=300' } })
  } catch (e) {
    return NextResponse.json({ citations: [], error: String(e) })
  }
}
