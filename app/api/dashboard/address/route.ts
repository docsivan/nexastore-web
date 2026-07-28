import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest) {
  try {
    const { record_id, address, city } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    // record_id is the Supabase customers row id
    const { error } = await supabase
      .from('customers')
      .update({ address, city })
      .eq('id', record_id)

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
