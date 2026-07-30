import { NextRequest, NextResponse } from 'next/server'
import { readAiTable } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // content_tier maps to ai_content.content_type
    const rows = await readAiTable('ai_content', {
      limit: 100,
      match: { content_type: 'local', status: 'published' },
    })
    return NextResponse.json({ count: rows.length }, { headers: { 'Cache-Control': 's-maxage=300' } })
  } catch (e) {
    return NextResponse.json({ count: 0, error: String(e) })
  }
}
