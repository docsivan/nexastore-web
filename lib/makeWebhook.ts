/**
 * lib/makeWebhook.ts
 * Fires a Make.com webhook with order data.
 * Used after successful payment to trigger:
 *   - WhatsApp order confirmation
 *   - Invoice email
 *   - Dispatch notification (fired separately from admin)
 */

export interface MakeOrderPayload {
  event:              string   // 'order.confirmed' | 'order.dispatched'
  order_id:           string
  tran_ref:           string
  customer_name:      string
  phone:              string
  email:              string
  clinic_name:        string
  city:               string
  address:            string
  items:              string   // JSON string of cart items
  subtotal:           number
  delivery_charge:    number
  total:              number
  payment_reference:  string
  notes:              string
}

export async function fireMakeWebhook(
  event: string,
  payload: Omit<MakeOrderPayload, 'event'>
): Promise<void> {
  // Route to correct webhook based on event type
  const webhookUrl = event === 'order.confirmed'
    ? process.env.MAKE_INVOICE_WEBHOOK_URL
    : event === 'order.dispatched'
    ? process.env.MAKE_DISPATCH_WEBHOOK_URL
    : process.env.MAKE_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn(`[makeWebhook] No webhook URL for event: ${event} — skipping`)
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event, ...payload }),
    })

    if (!res.ok) {
      console.error(`[makeWebhook] Webhook failed: ${res.status} ${res.statusText}`)
    } else {
      console.log(`[makeWebhook] Fired event: ${event} for order: ${payload.order_id}`)
    }
  } catch (err) {
    // Never block the payment flow if Make.com is down
    console.error('[makeWebhook] Webhook error (non-blocking):', err)
  }
}
