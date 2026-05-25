import { NextRequest, NextResponse } from 'next/server'
import { AirtableOrder, OrderFields, OrderItem } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { order_id: string } }
) {
  const { order_id } = params

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Orders`)
    url.searchParams.set('filterByFormula', `{order_id}='${order_id}'`)
    url.searchParams.set('maxRecords', '1')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: 'no-store',
    })

    if (!res.ok) return new NextResponse('Not found', { status: 404 })
    const data = await res.json()
    if (!data.records?.length) return new NextResponse('Not found', { status: 404 })

    const record = data.records[0] as AirtableOrder
    const f = record.fields as OrderFields

    let items: OrderItem[] = []
    try { items = typeof f.items === 'string' ? JSON.parse(f.items) : f.items } catch {}

    const subtotal = f.subtotal ?? items.reduce((s, i) => s + i.final_price * i.quantity, 0)
    const vat = Math.round(subtotal * 0.05 * 1000) / 1000
    const delivery = f.delivery_charge ?? 0
    const total = Math.round((subtotal + vat + delivery) * 1000) / 1000
    const date = f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${f.order_id}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; background: #fff; }
  .header { background: #0D0D0D; color: white; padding: 24px 32px; border-radius: 8px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header .badge { background: #F5A623; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-box { background: #f7f9fc; border-radius: 8px; padding: 16px; }
  .meta-box h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
  .meta-box p { margin: 2px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead { background: #0D0D0D; color: white; }
  th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .totals { margin-left: auto; width: 280px; }
  .totals tr td { border: none; padding: 4px 8px; }
  .totals .grand td { font-weight: 700; font-size: 15px; color: #0D0D0D; border-top: 2px solid #0D0D0D; padding-top: 8px; }
  .footer { text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>NexaStore</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px">AI Commerce Platform</p>
  </div>
  <div>
    <p style="margin:0;font-size:20px;font-weight:700">INVOICE</p>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px">${f.order_id}</p>
  </div>
</div>

<div class="meta">
  <div class="meta-box">
    <h3>Invoice To</h3>
    <p><strong>${f.customer_name}</strong></p>
    ${f.clinic_name ? `<p>${f.clinic_name}</p>` : ''}
    ${f.address ? `<p>${f.address}</p>` : ''}
    ${f.city ? `<p>${f.city}, Oman</p>` : '<p>Oman</p>'}
    ${f.phone ? `<p>${f.phone}</p>` : ''}
    ${f.email ? `<p>${f.email}</p>` : ''}
  </div>
  <div class="meta-box">
    <h3>Invoice Details</h3>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Order ID:</strong> ${f.order_id}</p>
    <p><strong>Payment:</strong> ${f.payment_status ?? '—'}</p>
    <p><strong>Delivery:</strong> ${f.delivery_status ?? '—'}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Pack Size</th>
      <th style="text-align:right">Unit Price</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.pack_size ?? '—'}</td>
      <td style="text-align:right">${fmt(item.final_price)}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${fmt(item.final_price * item.quantity)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
  <tr><td>VAT (5%)</td><td style="text-align:right">${fmt(vat)}</td></tr>
  <tr><td>Delivery</td><td style="text-align:right">${delivery > 0 ? fmt(delivery) : 'Free'}</td></tr>
  <tr class="grand"><td>Total</td><td style="text-align:right">${fmt(total)}</td></tr>
</table>

<div class="footer">
  <p>Thank you for choosing NexaStore! For queries: info@nexastore.io | +968 97780725</p>
  <p>ISO 13485:2016 Certified · MOH Oman Registered · CE Marked</p>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoice-${f.order_id}.html"`,
      },
    })
  } catch {
    return new NextResponse('Error generating invoice', { status: 500 })
  }
}
