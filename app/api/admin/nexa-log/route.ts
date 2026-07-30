import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('ai_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ entries: [] })

    const entries = (data ?? []).map((r) => ({
      timestamp:    r.timestamp    ?? '',
      trigger_type: r.trigger_type ?? '',
      action:       r.action       ?? '',
      target:       r.target       ?? '',
      field:        r.field        ?? '',
      value:        r.value        ?? '',
      reason:       r.reason       ?? '',
      status:       r.status       ?? '',
    }))

    return NextResponse.json({ entries })
  } catch {
    return NextResponse.json({ entries: [] })
  }
}
