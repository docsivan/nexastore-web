import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from '@/lib/rate-limit'
import { sessions, generateSessionToken, ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL } from '@/lib/admin-session'
import { verifyAdminPassword, findAdminUser, recordLastLogin } from '@/lib/admin-users'

function safe_eq(a: string, b: string): boolean {
  if (a.length !== b.length) { crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1)); return false }
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) } catch { return false }
}

function issueSession(userId?: string, userEmail?: string): NextResponse {
  const token = generateSessionToken()
  sessions.set(token, { at: Date.now(), userId, userEmail })
  Array.from(sessions.entries()).forEach(([t, s]) => { if (Date.now() - s.at > ADMIN_SESSION_TTL) sessions.delete(t) })
  const res = NextResponse.json({ success: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   false,
    sameSite: 'lax',
    maxAge:   ADMIN_SESSION_TTL / 1000,
    path:     '/',
  })
  return res
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit(rlKey(ip, 'admin-auth'), RATE_CONFIGS.admin)
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked)

  let body: { pin?: string; email?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  // Email + password login
  if (body.email && body.password) {
    const user = await findAdminUser(body.email)
    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const ok = await verifyAdminPassword(body.email, body.password)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials', attemptsRemaining: Math.max(0, rl.remaining) }, { status: 401 })
    }
    recordLastLogin(body.email).catch(() => {})
    return issueSession(user.id, user.email)
  }

  // PIN login (legacy)
  const submitted = typeof body.pin === 'string' ? body.pin : ''
  const correct   = process.env.ADMIN_PIN ?? ''

  if (!correct) {
    console.error('[admin/auth] ADMIN_PIN not set')
    return NextResponse.json({ error: 'Config error' }, { status: 500 })
  }

  if (!safe_eq(submitted, correct)) {
    console.warn('[admin/auth] Failed PIN from ' + ip + ' — ' + rl.remaining + ' left')
    return NextResponse.json({ error: 'Incorrect PIN', attemptsRemaining: Math.max(0, rl.remaining) }, { status: 401 })
  }

  return issueSession()
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (token) sessions.delete(token)
  const res = NextResponse.json({ success: true })
  res.cookies.delete(ADMIN_SESSION_COOKIE)
  return res
}
