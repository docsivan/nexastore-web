import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkPin(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .gte('created_at', since)
      // priority is text — the AI writers emit both '1'..'3' and 'medium'
      .order('priority', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ entries: [], new_count: 0, pattern_count: 0 })

    const entries = (data ?? []).map((r) => ({
      record_id:       String(r.id),
      insight_id:      String(r.insight_id      ?? ''),
      package:         String(r.package         ?? ''),
      insight_type:    String(r.insight_type    ?? r.package ?? ''),
      insight_text:    String(r.insight_text    ?? ''),
      action_required: String(r.action_required ?? ''),
      priority:        Number(r.priority) || 0,
      status:          String(r.status          ?? 'new'),
      created_at:      String(r.created_at      ?? ''),
    }))

    const new_count     = entries.filter((e) => e.status === 'new').length
    const pattern_count = entries.filter((e) => e.insight_type === 'pattern').length

    return NextResponse.json({ insights: entries, new_count, pattern_count })
  } catch {
    return NextResponse.json({ entries: [], new_count: 0, pattern_count: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { record_id, status } = await req.json() as { record_id: string; status: string }
    if (!record_id || !status) return NextResponse.json({ error: 'record_id and status required' }, { status: 400 })

    const allowed = ['acknowledged', 'dismissed', 'actioned', 'pending_approval']
    if (!allowed.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

    const { error } = await supabase
      .from('ai_insights')
      .update({ status })
      .eq('id', record_id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
