import { NextRequest, NextResponse } from 'next/server'
import { supabase, writeLog } from '@/lib/supabase'
import { sendMail } from '@/lib/mailer'
import { waitUntil } from '@vercel/functions'

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
 * It also emails SIGNUP_NOTIFY_EMAIL so a human knows a signup happened while
 * provisioning is still manual. The portal copy was softened to match what
 * this actually does — no automated-setup promises.
 */

/** Where new-signup alerts go. */
const NOTIFY_EMAIL = process.env.SIGNUP_NOTIFY_EMAIL || 'docsivan@gmail.com'

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

    // Notify the team. Non-blocking — a mail outage must not fail the signup,
    // and the lead is already persisted above. waitUntil, not a bare promise:
    // on serverless the invocation freezes once the response is returned, so
    // fire-and-forget silently never runs.
    waitUntil(sendMail({
      to: NOTIFY_EMAIL,
      subject: `New Zevio signup — ${body.business_name || name}`,
      html: signupNotificationHtml({ ...body, name, email }),
    }).catch((e) => console.error('[provision] notification email failed:', e)))

    return NextResponse.json({ success: true, captured: true })
  } catch (e) {
    console.error('[provision]', e)
    return NextResponse.json(
      { error: 'We could not complete your signup. Please try again shortly.' },
      { status: 500 }
    )
  }
}

/** Plain, readable summary of a Setup Portal submission. */
function signupNotificationHtml(d: ProvisionRequest): string {
  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding:6px 14px 6px 0;color:#6b7280">${label}</td><td style="padding:6px 0"><strong>${value}</strong></td></tr>` : ''
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#111">
  <h2 style="margin:0 0 4px">New Zevio signup</h2>
  <p style="margin:0 0 18px;color:#6b7280;font-size:13px">Submitted via the Setup Portal at /setup</p>
  <table style="border-collapse:collapse;font-size:14px">
    ${row('Business', d.business_name)}
    ${row('Contact', d.name)}
    ${row('Email', d.email)}
    ${row('Phone', d.phone)}
    ${row('Industry', d.industry)}
    ${row('Country', d.country)}
    ${row('Currency', d.currency)}
    ${row('Plan', d.plan)}
  </table>
  <p style="margin:22px 0 0;padding:12px 14px;background:#fff7ed;border-left:3px solid #f59e0b;font-size:13px;color:#92400e">
    Provisioning is still manual — nothing has been created automatically.
    The customer was told the team will be in touch within 24 hours.
  </p>
</body></html>`
}
