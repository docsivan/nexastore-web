import { NextRequest, NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-guard'
import { getSuperAdmins, findAdminUser, updateAdminUserPassword } from '@/lib/admin-users'
import { getSessionUser } from '@/lib/admin-session'
import { sendMail, welcomeEmailHtml } from '@/lib/mailer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function isSuperAdmin(req: NextRequest): boolean {
  const session = getSessionUser(req)
  if (!session?.userEmail) return false
  return getSuperAdmins().some(u => u.email.toLowerCase() === session.userEmail!.toLowerCase())
}

export async function POST(req: NextRequest) {
  const guard = guardAdminRoute(req)
  if (guard.rateLimitResponse) return guard.rateLimitResponse
  if (!guard.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })

  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await findAdminUser(email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tempPassword = crypto.randomBytes(6).toString('hex')
  const ok = await updateAdminUserPassword(email, tempPassword)
  if (!ok) return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })

  try {
    await sendMail({
      to: email,
      subject: 'Hayat Supplies Admin — Password Reset',
      html: welcomeEmailHtml(user.name, email, tempPassword),
    })
  } catch (e) {
    console.error('[users/reset-password] email failed:', e)
  }

  return NextResponse.json({ success: true })
}
