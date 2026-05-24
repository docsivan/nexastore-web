import { NextRequest, NextResponse } from 'next/server'
import { generateWhatsAppMessage, WhatsAppContext } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ctx: WhatsAppContext = await req.json()

    if (!ctx.type) {
      return NextResponse.json({ error: 'context type is required' }, { status: 400 })
    }

    const message = await generateWhatsAppMessage(ctx)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[POST /api/whatsapp/message]', error)
    // Return a sensible fallback so the button always works
    return NextResponse.json({
      message: 'Hello NexaStore, I need assistance with my order. Please help me.',
      fallback: true,
    })
  }
}
