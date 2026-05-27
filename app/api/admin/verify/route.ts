import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'adminAuth'
const MAX_AGE = 8 * 60 * 60 // 8 hours

export async function GET(req: NextRequest) {
  if (req.cookies.get(COOKIE)?.value === 'true') {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}

export async function POST(req: NextRequest) {
  let body: { pin?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const correct = process.env.ADMIN_PIN ?? ''
  if (!correct) return NextResponse.json({ error: 'Config error' }, { status: 500 })
  if (body.pin !== correct) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, 'true', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  })
  return res
}

export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
