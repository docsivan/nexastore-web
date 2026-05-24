import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from '@/lib/rate-limit'
import { consumeResetToken } from '@/lib/admin-otp'
import { updateAdminUserPassword } from '@/lib/admin-users'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(rlKey(ip, 'admin-otp'), RATE_CONFIGS.admin)
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked)

  let body: { resetToken?: string; newPassword?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const token       = (body.resetToken ?? '').trim()
  const newPassword = (body.newPassword ?? '').trim()

  if (!token || !newPassword) return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })
  if (newPassword.length < 8)  return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const email = consumeResetToken(token)
  if (!email) return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 })

  const ok = await updateAdminUserPassword(email, newPassword)
  if (!ok) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })

  return NextResponse.json({ success: true })
}
