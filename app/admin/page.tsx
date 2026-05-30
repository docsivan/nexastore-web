'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatters'
import StockManagement from '@/components/admin/StockManagement'
import CustomerLookup from '@/components/admin/CustomerLookup'
import FlashSaleManager from '@/components/admin/FlashSaleManager'
import NexaBriefing from '@/components/admin/NexaBriefing'
import BannerManager from '@/components/admin/BannerManager'
import NexaControl from '@/components/admin/NexaControl'

interface AdminOrder {
  record_id: string; order_id: string; created_at: string
  customer_name: string; clinic_name: string; phone: string; email: string; city: string
  items: { item_code: string; name: string; quantity: number; final_price: number; pack_size: string }[]
  subtotal: number; delivery_charge: number; total: number
  payment_status: string; delivery_status: string; payment_reference: string; notes: string
}
interface Stats { total_orders: number; paid_orders: number; pending_orders: number; today_orders: number; total_revenue: number }

const DELIVERY_OPTS = ['processing', 'dispatched', 'delivered', 'cancelled']
const PAYMENT_OPTS  = ['pending', 'paid', 'failed']
const D_COLORS: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-700', dispatched: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',  cancelled: 'bg-red-100 text-red-700',
}
const P_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', failed: 'bg-red-100 text-red-700',
}
const fmtDate = (d: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

type AdminTab = 'orders' | 'stock' | 'customers' | 'flash-sale' | 'briefing' | 'banners' | 'haya'

export default function AdminPage() {
  const [pinInput, setPinInput]           = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError]         = useState('')
  const [authLoading, setAuthLoading]     = useState(false)
  const [tab, setTab]                     = useState<AdminTab>('orders')
  const [newInsightCount, setNewInsightCount] = useState(0)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/verify')
      .then(r => { if (r.ok) { setAuthenticated(true); loadDashboard() } })
      .catch(() => {})
  }, [])

  const loadDashboard = async () => {
    const [sR, oR, iR] = await Promise.allSettled([
      fetch('/api/admin/stats'),
      fetch('/api/admin/orders'),
      fetch('/api/admin/insights'),
    ])
    if (sR.status === 'fulfilled' && sR.value.ok) { const d = await sR.value.json(); setStats(d.stats) }
    if (oR.status === 'fulfilled' && oR.value.ok) { const d = await oR.value.json(); setOrders(d.orders || []) }
    if (iR.status === 'fulfilled' && iR.value.ok) { const d = await iR.value.json(); setNewInsightCount(d.new_count ?? 0) }
  }

  const doLogin = async (p: string) => {
    setAuthLoading(true)
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: p.trim() }),
      })
      if (!res.ok) {
        setAuthError('Incorrect PIN. Please try again.')
        setAuthLoading(false); return
      }
      setAuthenticated(true)
      loadDashboard()
    } catch {
      setAuthError('Connection error. Try again.')
      setAuthLoading(false)
    }
  }

  const fetchOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      if (res.ok) { const data = await res.json(); setOrders(data.orders || []) }
    } catch {}
    setOrdersLoading(false)
  }

  const updateStatus = async (recordId: string, field: string, value: string) => {
    if (!authenticated) return
    setUpdating(recordId + field)
    try {
      await fetch('/api/admin/orders/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, [field]: value }),
      })
      setOrders(prev => prev.map(o => o.record_id === recordId ? { ...o, [field]: value } : o))
    } catch {}
    setUpdating(null)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/verify', { method: 'DELETE' })
    setAuthenticated(false); setOrders([]); setStats(null)
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.delivery_status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return o.customer_name?.toLowerCase().includes(q) || o.order_id?.toLowerCase().includes(q) ||
             o.clinic_name?.toLowerCase().includes(q) || o.phone?.includes(q)
    }
    return true
  })

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="font-heading font-bold text-2xl text-primary">NexaStore</Link>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-body font-semibold px-3 py-1.5 rounded-full mt-3 mx-auto">
              🔒 Staff Admin
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-primary-dark mb-2">Admin PIN</label>
                <input
                type="password" value={pinInput}
                onChange={e => { setPinInput(e.target.value); setAuthError('') }}
                onKeyDown={e => e.key === 'Enter' && doLogin(pinInput)}
                placeholder="Enter Admin PIN"
                className="input-field w-full"
                autoFocus
              />
              {authError && <p className="mt-2 text-sm font-body text-red-600">{authError}</p>}
            </div>
            <button onClick={() => doLogin(pinInput)} disabled={authLoading || !pinInput.trim()}
              className="btn-primary w-full py-3 disabled:opacity-40">
              {authLoading ? 'Verifying...' : 'Access Admin Panel'}
            </button>
          </div>
          <p className="text-center text-xs font-body text-slate-muted mt-4">
            <Link href="/admin/forgot-password" className="hover:text-primary transition-colors">Forgot password?</Link>
          </p>
          <p className="text-center text-xs font-body text-slate-muted mt-2">
            <Link href="/" className="hover:text-primary transition-colors">← Back to store</Link>
          </p>
        </div>
      </main>
    )
  }

  const ALL_TABS: { key: AdminTab; label: string }[] = [
    { key: 'orders',     label: `Orders (${orders.length})` },
    { key: 'stock',      label: 'Stock' },
    { key: 'customers',  label: 'Customers' },
    { key: 'flash-sale', label: 'Flash Sales' },
    { key: 'briefing',   label: 'Briefing' },
    { key: 'banners',    label: 'Banners' },
    { key: 'haya',       label: newInsightCount > 0 ? `Haya Brain (${newInsightCount})` : 'Haya Brain' },
  ]

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-primary text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-heading font-bold text-lg text-white hover:text-white/90">NexaStore</Link>
            <span className="text-white/40">·</span>
            <span className="text-white/80 text-sm font-body">Staff Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => authenticated && fetchOrders()}
              className="text-white/70 hover:text-white text-sm font-body transition-colors">↻ Refresh</button>
            <Link href="/admin/users" className="text-white/60 hover:text-white text-sm font-body transition-colors">Users</Link>
            <button onClick={handleLogout} className="text-white/60 hover:text-white text-sm font-body transition-colors">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Orders', value: stats.total_orders, color: 'text-primary' },
              { label: 'Paid Orders',  value: stats.paid_orders,  color: 'text-green-600' },
              { label: 'Pending',      value: stats.pending_orders, color: 'text-amber-600' },
              { label: 'Today',        value: stats.today_orders, color: 'text-blue-600' },
              { label: 'Revenue',      value: formatPrice(stats.total_revenue), color: 'text-primary' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-border p-4 text-center shadow-sm">
                <p className={`font-heading font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="font-body text-xs text-slate-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto">
          {ALL_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-lg text-sm font-body font-medium transition-colors whitespace-nowrap flex-shrink-0 ${tab === t.key ? 'bg-primary text-white' : 'text-slate-muted hover:text-primary'}`}>
              {t.label}
            </button>
          ))}
          <Link href="/admin/intelligence"
            className="px-3 py-2 rounded-lg text-sm font-body font-medium transition-colors whitespace-nowrap flex-shrink-0 text-slate-muted hover:text-primary hover:bg-primary/5">
            Mission Control
          </Link>
        </div>

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, order ID, phone..."
                className="input-field text-sm py-2 w-full sm:w-72" />
              <div className="flex gap-2 flex-wrap">
                {['all', 'processing', 'dispatched', 'delivered'].map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${statusFilter === f ? 'bg-primary text-white' : 'bg-white border border-border text-slate-muted hover:border-primary hover:text-primary'}`}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {ordersLoading && [1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse h-20" />)}
            {!ordersLoading && filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-border p-10 text-center">
                <p className="font-body text-slate-muted">No orders match this filter</p>
              </div>
            )}

            <div className="space-y-3">
              {filtered.map(order => (
                <div key={order.order_id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-4 cursor-pointer hover:bg-surface/30 transition-colors"
                    onClick={() => setExpanded(expanded === order.order_id ? null : order.order_id)}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-heading font-semibold text-sm text-primary-dark">{order.order_id}</p>
                        <p className="font-body text-xs text-slate-muted mt-0.5">
                          {order.customer_name}{order.clinic_name ? ` · ${order.clinic_name}` : ''} · {order.city} · {fmtDate(order.created_at)}
                        </p>
                        <p className="font-body text-xs text-slate-muted">{order.phone} · {order.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${P_COLORS[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>{order.payment_status}</span>
                        <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${D_COLORS[order.delivery_status] || 'bg-gray-100 text-gray-600'}`}>{order.delivery_status}</span>
                        <span className="font-heading font-bold text-sm text-primary-dark">{formatPrice(order.total)}</span>
                        <svg className={`w-4 h-4 text-slate-muted transition-transform ${expanded === order.order_id ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expanded === order.order_id && (
                    <div className="border-t border-border px-4 py-4 bg-surface/20 space-y-3">
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="font-body text-primary-dark">
                              {item.name}{item.pack_size ? <span className="text-slate-muted text-xs ml-1">({item.pack_size})</span> : ''}
                            </span>
                            <span className="font-body text-slate-muted shrink-0 ml-3 text-xs">
                              x{item.quantity} · {formatPrice(item.final_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-body text-slate-muted">Delivery:</span>
                          <select value={order.delivery_status}
                            onChange={e => updateStatus(order.record_id, 'delivery_status', e.target.value)}
                            disabled={updating === order.record_id + 'delivery_status'}
                            className="text-xs font-body border border-border rounded-lg px-2 py-1.5 bg-white focus:border-primary outline-none">
                            {DELIVERY_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-body text-slate-muted">Payment:</span>
                          <select value={order.payment_status}
                            onChange={e => updateStatus(order.record_id, 'payment_status', e.target.value)}
                            disabled={updating === order.record_id + 'payment_status'}
                            className="text-xs font-body border border-border rounded-lg px-2 py-1.5 bg-white focus:border-primary outline-none">
                            {PAYMENT_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {updating?.startsWith(order.record_id) && (
                          <span className="text-xs font-body text-slate-muted animate-pulse">Saving...</span>
                        )}
                        <div className="ml-auto">
                          <a href={`https://wa.me/${order.phone}?text=${encodeURIComponent(`Hello ${order.customer_name}, this is NexaStore with an update on your order ${order.order_id}.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs font-body font-medium text-green-600 hover:text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
                            WhatsApp Customer
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'stock'      && authenticated && <StockManagement />}
        {tab === 'customers'  && authenticated && <CustomerLookup />}
        {tab === 'flash-sale' && authenticated && <FlashSaleManager />}
        {tab === 'briefing'   && authenticated && <NexaBriefing />}
        {tab === 'banners'    && authenticated && <BannerManager />}
        {tab === 'haya'       && authenticated && <NexaControl />}
      </div>
    </main>
  )
}
