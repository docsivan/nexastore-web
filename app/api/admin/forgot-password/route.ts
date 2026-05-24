import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from '@/lib/rate-limit'
import { findAdminUser, getSuperAdminEmails } from '@/lib/admin-users'
import { generateAdminOtp } from '@/lib/admin-otp'
import { sendMail, otpEmailHtml } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(rlKey(ip, 'admin-otp'), RATE_CONFIGS.admin)
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked)

  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await findAdminUser(email)
  if (!user || !user.is_active) {
    // Return success anyway to avoid email enumeration
    return NextResponse.json({ success: true })
  }

  const otp = generateAdminOtp(email)
  const superEmails = getSuperAdminEmails()

  try {
    await sendMail({
      to: superEmails,
      subject: 'Hayat Supplies Admin — Password Reset OTP',
      html: otpEmailHtml(otp, `${user.name} (${email})`),
    })
  } catch (e) {
    console.error('[forgot-password] email failed:', e)
    return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
