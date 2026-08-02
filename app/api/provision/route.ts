import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeLog } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Setup Portal submission handler.
 *
 * ⚠️ THIS DOES NOT PROVISION ANYTHING YET.
 *
 * Z-004 Task 2 (the n8n provisioning engine that was to create the store,
 * ERP and AI assistant) was never built. This endpoint exists so the Setup
 * Portal's final step does not 404 and, more importantly, so no signup is
 * lost while that engine is outstanding.
 *
 * It captures the lead in two places:
 *   haya_waitlist — the contact fields, for follow-up
 *   ai_log        — the complete payload as JSON, since industry / plan /
 *                   business_name / country / currency have no columns yet
 *
 * The portal's success screen currently promises the store will be ready in
 * ~10 minutes. That promise is NOT yet backed by anything — see the note in
 * the Z-005 handover before putting this in front of real customers.
 */

interface ProvisionRequest {
  industry?: string
  business_name?: string
  name?: string
  email?: string
  phone?: string
  country?: string
  currency?: string
  plan?: string
}

export async function POST(req: NextRequest) {
  let body: ProvisionRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('haya_waitlist').insert({
      name,
      email,
      phone:    (body.phone ?? '').trim() || null,
      source:   'setup_portal',
      language: 'en',
      status:   'pending_provision',
    })
    if (error) throw new Error(error.message)

    // Keep the fields haya_waitlist has no columns for.
    await writeLog({
      timestamp:    new Date().toISOString(),
      signal_type:  'provision_request',
      trigger_type: 'setup_portal',
      action:       'signup',
      target:       email,
      field:        body.business_name ?? '',
      value:        JSON.stringify(body).slice(0, 2000),
      reason:       `industry=${body.industry ?? ''} plan=${body.plan ?? ''} country=${body.country ?? ''}`,
      status:       'captured',
    })

    return NextResponse.json({ success: true, captured: true })
  } catch (e) {
    console.error('[provision]', e)
    return NextResponse.json(
      { error: 'We could not complete your signup. Please try again shortly.' },
      { status: 500 }
    )
  }
}
