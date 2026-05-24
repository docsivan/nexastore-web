import { NextRequest, NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-guard'
import { listAdminUsers, createAdminUser, deactivateAdminUser, findAdminUser, getSuperAdmins } from '@/lib/admin-users'
import { getSessionUser } from '@/lib/admin-session'
import { sendMail, welcomeEmailHtml } from '@/lib/mailer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function isSuperAdmin(req: NextRequest): boolean {
  const session = getSessionUser(req)
  if (!session?.userEmail) return false
  return getSuperAdmins().some(u => u.email.toLowerCase() === session.userEmail!.toLowerCase())
}

export async function GET(req: NextRequest) {
  const guard = guardAdminRoute(req)
  if (guard.rateLimitResponse) return guard.rateLimitResponse
  if (!guard.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const users = await listAdminUsers()
    // Never expose passwordHash
    const safe = users.map(({ password_hash: _ph, ...u }) => u)
    return NextResponse.json({ users: safe })
  } catch {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = guardAdminRoute(req)
  if (guard.rateLimitResponse) return guard.rateLimitResponse
  if (!guard.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })

  let body: { name?: string; email?: string; role?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const name  = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const role  = (body.role ?? 'staff') as 'super_admin' | 'admin' | 'staff'

  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await findAdminUser(email)
  if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 409 })

  const tempPassword = crypto.randomBytes(6).toString('hex')
  const id = `admin_${Date.now()}`

  try {
    await createAdminUser({ id, name, email, role, is_active: true, plainPassword: tempPassword })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }

  try {
    await sendMail({
      to: email,
      subject: 'Welcome to Hayat Supplies Admin',
      html: welcomeEmailHtml(name, email, tempPassword),
    })
  } catch (e) {
    console.error('[admin/users] welcome email failed:', e)
    // Non-fatal — user is created, email just failed
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const guard = guardAdminRoute(req)
  if (guard.rateLimitResponse) return guard.rateLimitResponse
  if (!guard.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })

  const email = req.nextUrl.searchParams.get('email') ?? ''
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Protect super admins from being deactivated
  const superAdmins = getSuperAdmins()
  if (superAdmins.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: 'Cannot deactivate a super admin' }, { status: 403 })
  }

  const ok = await deactivateAdminUser(email)
  if (!ok) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
