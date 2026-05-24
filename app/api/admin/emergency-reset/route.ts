import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from '@/lib/rate-limit'
import { updateAdminUserPassword, findAdminUser } from '@/lib/admin-users'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function safe_eq(a: string, b: string): boolean {
  if (a.length !== b.length) { crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1)); return false }
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) } catch { return false }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(rlKey(ip, 'admin-otp'), RATE_CONFIGS.admin)
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked)

  let body: { emergencyToken?: string; email?: string; newPassword?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const providedToken = (body.emergencyToken ?? '').trim()
  const correctToken  = process.env.EMERGENCY_TOKEN ?? ''

  if (!correctToken) return NextResponse.json({ error: 'Emergency reset not configured' }, { status: 500 })
  if (!safe_eq(providedToken, correctToken)) return NextResponse.json({ error: 'Invalid emergency token' }, { status: 401 })

  const email       = (body.email ?? '').trim().toLowerCase()
  const newPassword = (body.newPassword ?? '').trim()
  if (!email || !newPassword) return NextResponse.json({ error: 'Email and new password required' }, { status: 400 })
  if (newPassword.length < 8)  return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const user = await findAdminUser(email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ok = await updateAdminUserPassword(email, newPassword)
  if (!ok) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })

  return NextResponse.json({ success: true, message: `Password reset for ${email}` })
}
