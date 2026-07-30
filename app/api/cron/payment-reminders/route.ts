import { NextRequest, NextResponse } from 'next/server'
import { atList, atPatch } from '@/lib/ai-tables'
import { PLATFORM_NAME } from '@/lib/brand'

const CRON_SECRET  = process.env.CRON_SECRET
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexastore-eight.vercel.app'

async function getFailedOrders() {
  const { records } = await atList('Orders', { match: { payment_status: 'failed' } })
  return records
}

async function updateOrderNotes(recordId: string, notes: Record<string, string>, paymentStatus: string) {
  await atPatch('Orders', recordId, {
    notes: JSON.stringify(notes),
    payment_status: paymentStatus,
  })
}

async function sendWhatsAppReminder(phone: string, orderId: string, type: '1hr' | '1day' | 'Cancelled') {
  const retryUrl = `${SITE_URL}/checkout/failed?id=${orderId}`
  const messages = {
    '1hr':       `Hello! Your ${PLATFORM_NAME} order ${orderId} is awaiting payment. Retry here: ${retryUrl}`,
    '1day':      `Final reminder: Your ${PLATFORM_NAME} order ${orderId} will be cancelled in a few hours if payment is not completed.`,
    'Cancelled': `Your ${PLATFORM_NAME} order ${orderId} has been cancelled. You can place a new order at ${SITE_URL}`,
  }
  console.log(`[WhatsApp ${type}] To: ${phone} — ${messages[type]}`)
  return true
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now     = new Date()
  const results = { processed: 0, reminded_1hr: 0, reminded_1day: 0, cancelled: 0, errors: 0 }

  try {
    const orders = await getFailedOrders()
    for (const record of orders) {
      const f = record.fields
      results.processed++
      let reminder: Record<string, string> = {}
      try { reminder = JSON.parse(f.notes || '{}') } catch { continue }
      if (!reminder.reminder_1hr_due || reminder.reminder_status === 'Cancelled') continue
      const oneHrDue  = new Date(reminder.reminder_1hr_due)
      const oneDayDue = new Date(reminder.reminder_1day_due)
      try {
        if (now >= oneDayDue && reminder.reminder_status === 'reminded_1hr') {
          await sendWhatsAppReminder(f.phone, f.order_id, '1day')
          await updateOrderNotes(record.id, { ...reminder, reminder_status: 'reminded_1day' }, 'Failed')
          results.reminded_1day++
          continue
        }
        if (now >= oneDayDue && reminder.reminder_status === 'reminded_1day') {
          await sendWhatsAppReminder(f.phone, f.order_id, 'Cancelled')
          await updateOrderNotes(record.id, { ...reminder, reminder_status: 'Cancelled' }, 'Cancelled')
          results.cancelled++
          continue
        }
        if (now >= oneHrDue && reminder.reminder_status === 'scheduled') {
          await sendWhatsAppReminder(f.phone, f.order_id, '1hr')
          await updateOrderNotes(record.id, { ...reminder, reminder_status: 'reminded_1hr' }, 'Failed')
          results.reminded_1hr++
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown'
        console.error(`[cron] Order ${f.order_id}: ${msg}`)
        results.errors++
      }
    }
    return NextResponse.json({ success: true, timestamp: now.toISOString(), ...results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
