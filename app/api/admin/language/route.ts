import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const CONFIG_KEY = 'second_language'

function checkAdmin(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('store_config')
      .select('config_value')
      .eq('config_key', CONFIG_KEY)
      .maybeSingle()
    if (error || !data) return NextResponse.json({ second_language: 'none' })
    return NextResponse.json({ second_language: data.config_value ?? 'none' })
  } catch {
    return NextResponse.json({ second_language: 'none' })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { second_language } = await req.json() as { second_language: string }
  const allowed = ['none', 'ar', 'fr', 'hi', 'ur']
  if (!allowed.includes(second_language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  try {
    // config_key is unique, so a single upsert replaces the old
    // read-then-insert-or-patch round trip.
    const { error } = await supabase
      .from('store_config')
      .upsert(
        { config_key: CONFIG_KEY, config_value: second_language, updated_at: new Date().toISOString() },
        { onConflict: 'config_key' }
      )
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
