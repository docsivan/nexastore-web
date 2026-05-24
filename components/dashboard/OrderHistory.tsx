'use client'

import { formatPrice } from '@/lib/formatters'

export interface OrderItem {
  item_code: string
  name: string
  quantity: number
  final_price: number
  pack_size: string
}

export interface CustomerOrder {
  record_id: string
  order_id: string
  created_at: string
  items: OrderItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_status: string
  delivery_status: string
  city: string
  notes: string
}

const D_COLORS: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-700',
  dispatched:  'bg-blue-100 text-blue-700',
  delivered:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
}
const P_COLORS: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed:  'bg-red-100 text-red-700',
}

function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

interface Props {
  orders: CustomerOrder[]
  loading: boolean
  expanded: string | null
  onExpand: (id: string | null) => void
}

export default function OrderHistory({ orders, loading, expanded, onExpand }: Props) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
    </div>
  )

  if (orders.length === 0) return (
    <div className="bg-white rounded-2xl border border-border p-12 text-center">
      <div className="w-12 h-12 rounded-[4px] bg-primary/5 flex items-center justify-center mx-auto mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary/40">
          <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
        </svg>
      </div>
      <p className="font-heading font-semibold text-primary-dark">No orders yet</p>
      <p className="font-body text-slate-muted text-sm mt-1">Your order history will appear here</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div key={order.order_id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div
            className="p-4 cursor-pointer hover:bg-surface/50 transition-colors"
            onClick={() => onExpand(expanded === order.order_id ? null : order.order_id)}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-heading font-semibold text-sm text-primary-dark">{order.order_id}</p>
                <p className="font-body text-xs text-slate-muted mt-0.5">
                  {fmtDate(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  {order.city ? ` · ${order.city}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${P_COLORS[order.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {order.payment_status}
                </span>
                <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${D_COLORS[order.delivery_status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {order.delivery_status}
                </span>
                <span className="font-heading font-bold text-sm text-primary-dark">{formatPrice(order.total)}</span>
                <svg
                  className={`w-4 h-4 text-slate-muted transition-transform ${expanded === order.order_id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {expanded === order.order_id && (
            <div className="border-t border-border px-4 py-4 bg-surface/30 space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-body font-medium text-primary-dark">{item.name}</span>
                    {item.pack_size && <span className="font-body text-slate-muted text-xs ml-2">{item.pack_size}</span>}
                  </div>
                  <span className="font-body text-slate-muted shrink-0 ml-4 text-xs">
                    x{item.quantity} · {formatPrice(item.final_price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-body text-slate-muted">
                  Delivery: {formatPrice(order.delivery_charge || 0)} · Total: {formatPrice(order.total)}
                </p>
                <a
                  href={`/api/dashboard/invoice/${order.order_id}`}
                  download
                  className="text-xs font-body font-medium text-primary border border-primary/30 px-3 py-1.5 rounded-btn hover:bg-primary hover:text-white transition-colors"
                >
                  ⬇ Download Invoice
                </a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
