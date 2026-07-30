import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeSignal } from '@/lib/memory'

export async function POST(req: NextRequest) {
  try {
    let customer_phone: string | undefined
    const {
      session_id,
      customer_name,
      clinic_name,
      messages,
      intent_summary,
      page_url,
      language,
      customer_phone: _phone,
    } = await req.json()
    customer_phone = _phone

    if (!session_id || !messages?.length) {
      return NextResponse.json({ ok: false })
    }

    // Build readable transcript
    const transcript = messages
      .map((m: { role: string; content: string }) =>
        `[${m.role.toUpperCase()}]: ${m.content}`
      )
      .join('\n\n')

    // Extract phone from transcript if not passed explicitly
    if (!customer_phone) {
      const phoneMatch = transcript.match(/(\+?968[\s-]?[0-9]{8}|\+?[0-9]{10,13})/);
      if (phoneMatch) customer_phone = phoneMatch[0].replace(/[\s-]/g, '');
    }

    // Detect outcome from transcript
    const lower = transcript.toLowerCase()
    const outcome =
      lower.includes('checkout') || lower.includes('order confirmed')
        ? 'converted'
        : lower.includes('escalat') || lower.includes('team will contact')
        ? 'escalated'
        : messages.length <= 2
        ? 'abandoned'
        : 'browsed'

    await supabase.from('conversations').insert({
      session_id,
      customer_id:    customer_phone ?? '',
      customer_name:  customer_name  ?? '',
      phone:          customer_phone ?? '',
      clinic_name:    clinic_name    ?? '',
      page_url:       page_url       ?? '',
      transcript,
      message_count:  messages.length,
      intent_summary: intent_summary ?? '',
      outcome,
      language:       language ?? 'en',
      analysed:       false,
    })

    // Also write signal to Haya_Memory with 2-sentence summary
    const lastAssistant = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'assistant')
    const chat_summary = lastAssistant
      ? `Visitor discussed: ${intent_summary || 'general enquiry'}. Outcome: ${outcome}.`
      : ''

    await writeSignal({
      session_id,
      customer_id: customer_phone ?? '',
      signal_type: 'chat',
      action:      'chat_ended',
      outcome,
      page_url:    page_url ?? '',
      chat_summary,
    })

    return NextResponse.json({ ok: true, outcome })
  } catch (err) {
    console.error('[chat/save]', err)
    return NextResponse.json({ ok: false })
  }
}
