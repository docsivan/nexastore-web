import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from '@/lib/rate-limit'
import { verifyAdminOtp } from '@/lib/admin-otp'
import { generateResetToken } from '@/lib/admin-otp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(rlKey(ip, 'admin-otp'), RATE_CONFIGS.admin)
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked)

  let body: { email?: string; otp?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const email = (body.email ?? '').trim().toLowerCase()
  const otp   = (body.otp ?? '').trim()
  if (!email || !otp) return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 })

  const valid = verifyAdminOtp(email, otp)
  if (!valid) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })

  const resetToken = generateResetToken(email)
  return NextResponse.json({ success: true, resetToken })
}
