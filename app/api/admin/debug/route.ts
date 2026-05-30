import { NextResponse } from 'next/server'

export async function GET() {
  const pin = process.env.ADMIN_PIN
  return NextResponse.json({
    pinLength: pin?.length ?? 0,
    pinSet: !!pin,
    pinFirst3: pin?.substring(0, 3) ?? 'empty',
    nodeEnv: process.env.NODE_ENV
  })
}
