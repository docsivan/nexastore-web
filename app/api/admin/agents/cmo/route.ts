import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pin = process.env.ADMIN_PIN!
  const origin = req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000'
  const res = await fetch(`${origin}/api/nexa/cmo`, {
    headers: { 'x-admin-pin': pin },
  })
  const data = res.ok ? await res.json() : { error: 'Agent call failed' }
  return NextResponse.json(data, { status: res.status })
}
