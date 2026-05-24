import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-session'

export async function GET(req: NextRequest) {
  // Primary: httpOnly session cookie (production)
  if (verifyAdminSession(req)) {
    return NextResponse.json({ authenticated: true })
  }
  // Fallback: x-admin-pin header (local dev — sessionStorage workaround)
  const pin = req.headers.get('x-admin-pin')
  if (pin && pin === (process.env.ADMIN_PIN ?? '')) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
