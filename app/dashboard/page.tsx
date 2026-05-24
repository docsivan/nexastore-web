'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCustomerSession, clearCustomerSession, CustomerSession } from '@/lib/session'
import { formatPrice } from '@/lib/formatters'
import OrderHistory, { CustomerOrder } from '@/components/dashboard/OrderHistory'
import ReorderButton from '@/components/dashboard/ReorderButton'
import SavedAddresses from '@/components/dashboard/SavedAddresses'
import Favourites from '@/components/dashboard/Favourites'
import AddressManager from '@/components/dashboard/AddressManager'

type Tab = 'orders' | 'address' | 'favourites'

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('orders')

  useEffect(() => {
    const s = getCustomerSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
    fetch(`/api/dashboard/orders?phone=${encodeURIComponent(s.phone)}`)
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  if (!session) return null

  const paid = orders.filter(o => o.payment_status === 'paid')
  const totalSpent = paid.reduce((s, o) => s + (o.total || 0), 0)
  const activeCount = orders.filter(o => o.delivery_status === 'processing').length

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders',     label: `Orders (${orders.length})` },
    { key: 'address',    label: 'Address' },
    { key: 'favourites', label: 'Favourites' },
  ]

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="font-heading font-bold text-xl text-white hover:text-white/90">NexaStore</Link>
            <p className="text-white/60 text-xs font-body mt-0.5">My Account</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-white/80 hover:text-white text-sm font-body">Shop</Link>
            <button
              onClick={() => { clearCustomerSession(); router.push('/') }}
              className="text-white/60 hover:text-white text-sm font-body"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-[4px] border border-border p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="font-heading font-bold text-xl text-primary-dark">{session.customer_name}</h1>
              {session.clinic_name && <p className="font-body text-slate-muted text-sm">{session.clinic_name}</p>}
              <p className="font-body text-slate-muted text-sm">
                {session.phone}{session.city ? ` · ${session.city}` : ''}
              </p>
            </div>
            <Link href="/products" className="btn-primary text-sm px-5 py-2.5">+ New Order</Link>
          </div>
          <div className="grid grid-cols-3 border-t border-border pt-6">
            <div className="text-center">
              <p className="font-heading font-bold text-2xl text-primary">{orders.length}</p>
              <p className="font-body text-xs text-slate-muted mt-1">Total Orders</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="font-heading font-bold text-2xl text-primary">{formatPrice(totalSpent)}</p>
              <p className="font-body text-xs text-slate-muted mt-1">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="font-heading font-bold text-2xl text-amber-500">{activeCount}</p>
              <p className="font-body text-xs text-slate-muted mt-1">Active Orders</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border p-1 w-fit" style={{borderRadius:'3px'}}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-body font-medium transition-colors ${tab === t.key ? 'bg-primary text-white' : 'text-slate-muted hover:text-primary hover:bg-surface'}`} style={{borderRadius:'3px'}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'orders' && (
          <div>
            <OrderHistory
              orders={orders}
              loading={loading}
              expanded={expanded}
              onExpand={setExpanded}
            />
            {/* Add reorder buttons to expanded orders */}
            {expanded && (
              <div className="mt-3 flex justify-end">
                {orders
                  .filter(o => o.order_id === expanded)
                  .map(o => (
                    <ReorderButton key={o.order_id} items={o.items} />
                  ))}
              </div>
            )}
          </div>
        )}

        {tab === 'address' && (
          <div className="bg-white rounded-[4px] border border-border p-6">
            <h2 className="font-heading font-bold text-lg text-primary-dark mb-4">Delivery Addresses</h2>
            <AddressManager />
          </div>
        )}

        {tab === 'favourites' && (
          <Favourites
            customerRecordId=""
            initialFavourites={[]}
          />
        )}
      </div>
    </main>
  )
}
