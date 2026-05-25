'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────

type RevenuePeriod = { orders: number; revenue: number }
type RevenueData = {
  today: RevenuePeriod; week: RevenuePeriod; month: RevenuePeriod; last_month: RevenuePeriod
  by_category: Record<string, number>
  top_products: Array<{ item_code: string; name: string; revenue: number }>
}

type MarginCategory = { revenue: number; cost: number; margin_pct: number }
type MarginData = {
  overall_margin_pct: number
  by_category: Record<string, MarginCategory>
  highest_margin: Array<{ item_code: string; name: string; margin_pct: number; revenue: number }>
  lowest_margin:  Array<{ item_code: string; name: string; margin_pct: number; revenue: number }>
}

type StockItem = {
  item_code: string; name: string; category: string; stock: number
  sold_30d: number; daily_velocity: number; days_to_stockout: number | null
  stock_value: number; status: 'green' | 'amber' | 'red'
}
type InventoryData = {
  summary: { total_products: number; low_stock_count: number; dead_stock_count: number; total_stock_value: number }
  low_stock: StockItem[]
  dead_stock: StockItem[]
  by_category_value: Record<string, number>
}

type CustomerData = {
  month: { new_customers: number; orders: number; revenue: number; avg_order_value: number }
  ninety_days: { unique_customers: number; repeat_customers: number; repeat_rate_pct: number; at_risk_count: number }
  top_customers: Array<{ name: string; orders: number; revenue: number; last_order: string }>
}

type ConversionData = {
  month: { paid_orders: number; abandoned_orders: number; conversion_rate: number; abandon_rate: number; avg_order_value: number }
  signals_30d: Record<string, number>
  top_viewed_products: Array<{ item_code: string; views: number }>
  top_cro_pages: Array<{ page_url: string; sessions: number }>
}

type SEOData = {
  coverage: { total_products_with_seo: number; with_schema: number; with_description: number; schema_coverage_pct: number }
  gsc: { top_queries: Array<{ query: string; clicks: number; impressions: number; position: number }>; low_ctr_opportunities: Array<{ query: string; ctr_pct: number; impressions: number }> }
  trends: Array<{ keyword: string; trend_score: number }>
  recent_insights: Array<{ insight_text: string; priority: string; status: string }>
}

type HayaInsight = { insight_text: string; priority: string; status: string; created_at: string; insight_type: string }
type HayaData = { records: HayaInsight[] }

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}
function pct(n: number) {
  return `${n.toFixed(1)}%`
}
function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return d }
}

function StatusBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  const cls = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',
  }[status]
  return <span className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full ${cls}`}>{status.toUpperCase()}</span>
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
      <p className="font-heading font-bold text-xl text-primary-dark">{value}</p>
      <p className="font-body text-xs text-slate-muted mt-1">{label}</p>
      {sub && <p className="font-body text-xs text-slate mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading font-bold text-base text-primary-dark mb-3">{children}</h2>
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-border rounded-xl p-5 shadow-sm ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  )
}

// ─── Auth screen ────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (pin: string) => void }) {
  const [pin, setPin]   = useState('')
  const [err, setErr]   = useState('')
  const [busy, setBusy] = useState(false)

  const tryPin = async (p: string) => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-pin': p } })
      if (res.ok) {
        sessionStorage.setItem('hs_admin_pin', p)
        onAuth(p)
      } else {
        setErr('Invalid PIN'); setBusy(false)
      }
    } catch {
      setErr('Connection error'); setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-heading font-bold text-2xl text-primary">NexaStore</Link>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-body font-semibold px-3 py-1.5 rounded-full mt-3 mx-auto block">
            Mission Control
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
          <div>
            <label className="block text-sm font-body font-medium text-primary-dark mb-2">Admin PIN</label>
            <div className="flex justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pin.length > i ? 'bg-primary border-primary' : 'bg-transparent border-slate-300'}`} />
              ))}
            </div>
            <input
              type="password" value={pin}
              onChange={e => { setPin(e.target.value.slice(0, 4)); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && tryPin(pin)}
              placeholder="Enter 4-digit PIN" maxLength={4}
              className="input-field w-full text-center tracking-widest text-lg" autoFocus />
            {err && <p className="mt-2 text-sm font-body text-red-600">{err}</p>}
          </div>
          <button onClick={() => tryPin(pin)} disabled={busy || !pin.trim()} className="btn-primary w-full py-3 disabled:opacity-40">
            {busy ? 'Verifying...' : 'Access Mission Control'}
          </button>
        </div>
        <p className="text-center text-xs font-body text-slate-muted mt-6">
          <Link href="/admin" className="hover:text-primary transition-colors">← Back to admin</Link>
        </p>
      </div>
    </main>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

type PanelKey = 'revenue' | 'margins' | 'inventory' | 'customers' | 'conversion' | 'seo' | 'haya' | 'agents' | 'geo'
const PANELS: { key: PanelKey; label: string }[] = [
  { key: 'revenue',    label: 'Revenue' },
  { key: 'margins',    label: 'Margins' },
  { key: 'inventory',  label: 'Inventory' },
  { key: 'customers',  label: 'Customers' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'seo',        label: 'SEO' },
  { key: 'haya',       label: 'Haya Intelligence' },
  { key: 'agents',     label: 'Agent Status' },
  { key: 'geo',        label: '🌐 GEO/AEO' },
]

type CitationRecord = { query: string; platform: string; cited: boolean; position: number; context: string; fetched_at: string }
type GeoInsight = { insight_type: string; insight_text: string; action_required: string; priority: string }
type GeoData = {
  citations:         CitationRecord[]
  insights:          GeoInsight[]
  arabic_pct:        number
  schema_pct:        number
  local_page_count:  number
}

type AgentInfo = {
  key:       string
  label:     string
  schedule:  string
  endpoint:  string
  insights_this_week: number
}

type PromotionRec = {
  promo_id:      string
  item_code:     string
  promo_discount: number
  starts_at:     string
  ends_at:       string
  status:        string
}

type AgentsData = {
  agents:     AgentInfo[]
  promotions: PromotionRec[]
}

function Dashboard({ pin }: { pin: string }) {
  const [active, setActive] = useState<PanelKey>('revenue')
  const [revenue,    setRevenue]    = useState<RevenueData | null>(null)
  const [margins,    setMargins]    = useState<MarginData | null>(null)
  const [inventory,  setInventory]  = useState<InventoryData | null>(null)
  const [customers,  setCustomers]  = useState<CustomerData | null>(null)
  const [conversion, setConversion] = useState<ConversionData | null>(null)
  const [seo,        setSEO]        = useState<SEOData | null>(null)
  const [haya,       setHaya]       = useState<HayaData | null>(null)
  const [agents,     setAgents]     = useState<AgentsData | null>(null)
  const [geo,        setGeo]        = useState<GeoData | null>(null)
  const [triggerBusy, setTriggerBusy] = useState<Record<string, boolean>>({})
  const [loading,    setLoading]    = useState<Record<PanelKey, boolean>>({
    revenue: false, margins: false, inventory: false, customers: false, conversion: false, seo: false, haya: false, agents: false, geo: false,
  })
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const headers = { 'x-admin-pin': pin }

  const fetchPanel = useCallback(async (key: PanelKey) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      if (key === 'revenue') {
        const r = await fetch('/api/intelligence/revenue', { headers })
        if (r.ok) setRevenue(await r.json())
      } else if (key === 'margins') {
        const r = await fetch('/api/intelligence/margins', { headers })
        if (r.ok) setMargins(await r.json())
      } else if (key === 'inventory') {
        const r = await fetch('/api/intelligence/inventory', { headers })
        if (r.ok) setInventory(await r.json())
      } else if (key === 'customers') {
        const r = await fetch('/api/intelligence/customers', { headers })
        if (r.ok) setCustomers(await r.json())
      } else if (key === 'conversion') {
        const r = await fetch('/api/intelligence/conversion', { headers })
        if (r.ok) setConversion(await r.json())
      } else if (key === 'seo') {
        const r = await fetch('/api/intelligence/seo', { headers })
        if (r.ok) setSEO(await r.json())
      } else if (key === 'haya') {
        const r = await fetch(`/api/admin/insights`, { headers })
        if (r.ok) {
          const d = await r.json()
          setHaya({ records: d.insights ?? [] })
        }
      } else if (key === 'geo') {
        const API_KEY = '' // fetched server-side via existing endpoints
        // Parallel fetch: citations + seo coverage + local page count
        const [citRes, seoRes, localRes, insRes] = await Promise.all([
          fetch('/api/intelligence/geo/citations', { headers }),
          fetch('/api/intelligence/seo', { headers }),
          fetch('/api/intelligence/geo/local-pages', { headers }),
          fetch('/api/admin/insights', { headers }),
        ])
        const citations: CitationRecord[] = citRes.ok ? ((await citRes.json()).citations ?? []) : []
        const seoD = seoRes.ok ? await seoRes.json() : null
        const localD = localRes.ok ? await localRes.json() : null
        const insD = insRes.ok ? await insRes.json() : null
        const geoInsights: GeoInsight[] = (insD?.insights ?? [])
          .filter((i: HayaInsight) => i.insight_type === 'geo_gap')
          .slice(0, 10)
          .map((i: HayaInsight) => ({
            insight_type:    i.insight_type,
            insight_text:    i.insight_text,
            action_required: '',
            priority:        i.priority,
          }))
        setGeo({
          citations,
          insights:         geoInsights,
          arabic_pct:       seoD?.coverage?.arabic_coverage_pct ?? 0,
          schema_pct:       seoD?.coverage?.schema_coverage_pct ?? 0,
          local_page_count: localD?.count ?? 0,
        })
        void API_KEY
      } else if (key === 'agents') {
        // Fetch insight counts per agent type this week
        const AGENT_DEFS = [
          { key: 'cmo',       label: 'CMO Agent',       schedule: 'Mon 02:00 UTC', endpoint: '/api/admin/agents/cmo',       insight_type: 'cmo_recommendation' },
          { key: 'cro',       label: 'CRO Agent',       schedule: 'Tue 02:00 UTC', endpoint: '/api/admin/agents/cro',       insight_type: 'cro_fix' },
          { key: 'inventory', label: 'Inventory Agent', schedule: 'Daily 02:30 UTC', endpoint: '/api/admin/agents/inventory', insight_type: 'inventory_alert' },
          { key: 'demand',    label: 'Demand Agent',    schedule: 'Sun 02:00 UTC',  endpoint: '/api/admin/agents/demand',    insight_type: 'demand_forecast' },
        ]
        const r = await fetch('/api/admin/insights', { headers })
        let insightCounts: Record<string, number> = {}
        if (r.ok) {
          const d = await r.json()
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
          for (const ins of (d.insights ?? []) as HayaInsight[]) {
            const type = ins.insight_type ?? ''
            if ((ins.created_at ?? '') >= weekAgo) {
              insightCounts[type] = (insightCounts[type] ?? 0) + 1
            }
          }
        }

        // Fetch active promotions
        const promoRes = await fetch('/api/admin/promotions', { headers })
        let promotions: PromotionRec[] = []
        if (promoRes.ok) {
          const pd = await promoRes.json()
          promotions = pd.promotions ?? []
        }

        setAgents({
          agents: AGENT_DEFS.map(a => ({
            key:      a.key,
            label:    a.label,
            schedule: a.schedule,
            endpoint: a.endpoint,
            insights_this_week: insightCounts[a.insight_type] ?? 0,
          })),
          promotions,
        })
      }
    } catch {}
    setLoading(prev => ({ ...prev, [key]: false }))
  }, [pin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load active panel when switching
  useEffect(() => {
    const data: Record<PanelKey, unknown> = { revenue, margins, inventory, customers, conversion, seo, haya, agents, geo }
    if (!data[active]) fetchPanel(active)
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      fetchPanel(active)
      setLastRefresh(new Date())
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [active, fetchPanel])

  // Refresh all on mount
  useEffect(() => { fetchPanel(active) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = loading[active]

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-heading font-bold text-lg text-white hover:text-white/90">NexaStore</Link>
            <span className="text-white/40">·</span>
            <span className="text-white/80 text-sm font-body">Mission Control</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-xs font-body hidden sm:block">
              Refreshed {fmtDate(lastRefresh.toISOString())} {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={() => { fetchPanel(active); setLastRefresh(new Date()) }}
              className="text-white/70 hover:text-white text-sm font-body transition-colors">↻ Refresh</button>
            <Link href="/admin" className="text-white/60 hover:text-white text-sm font-body transition-colors">← Admin</Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Panel tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto">
          {PANELS.map(p => (
            <button key={p.key} onClick={() => setActive(p.key)}
              className={`px-3 py-2 rounded-lg text-sm font-body font-medium transition-colors whitespace-nowrap flex-shrink-0 ${active === p.key ? 'bg-primary text-white' : 'text-slate-muted hover:text-primary'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* ── Revenue ── */}
        {!isLoading && active === 'revenue' && revenue && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Today Revenue"      value={fmt(revenue.today.revenue)}      sub={`${revenue.today.orders} orders`} />
              <KPI label="This Week Revenue"  value={fmt(revenue.week.revenue)}       sub={`${revenue.week.orders} orders`} />
              <KPI label="This Month Revenue" value={fmt(revenue.month.revenue)}      sub={`${revenue.month.orders} orders`} />
              <KPI label="Last Month Revenue" value={fmt(revenue.last_month.revenue)} sub={`${revenue.last_month.orders} orders`} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Revenue by Category (Month)">
                <div className="space-y-2">
                  {Object.entries(revenue.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, rev]) => (
                      <div key={cat} className="flex justify-between items-center text-sm font-body">
                        <span className="text-slate capitalize">{cat.replace(/-/g, ' ')}</span>
                        <span className="font-semibold text-primary-dark">{fmt(rev)}</span>
                      </div>
                    ))}
                </div>
              </Panel>
              <Panel title="Top 5 Products by Revenue (Month)">
                <div className="space-y-2">
                  {revenue.top_products.map((p, i) => (
                    <div key={p.item_code} className="flex items-center gap-3 text-sm font-body">
                      <span className="w-5 text-slate-muted text-center font-semibold">{i + 1}</span>
                      <span className="flex-1 text-slate truncate">{p.name}</span>
                      <span className="font-semibold text-primary-dark">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ── Margins ── */}
        {!isLoading && active === 'margins' && margins && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KPI label="Overall Gross Margin" value={pct(margins.overall_margin_pct)} />
              <KPI label="Highest Margin Product" value={margins.highest_margin[0]?.name ?? '—'} sub={pct(margins.highest_margin[0]?.margin_pct ?? 0)} />
              <KPI label="Lowest Margin Product"  value={margins.lowest_margin[0]?.name  ?? '—'} sub={pct(margins.lowest_margin[0]?.margin_pct  ?? 0)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Panel title="Category Margins">
                <div className="space-y-2">
                  {Object.entries(margins.by_category)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([cat, d]) => (
                      <div key={cat} className="text-sm font-body">
                        <div className="flex justify-between">
                          <span className="text-slate capitalize">{cat.replace(/-/g, ' ')}</span>
                          <span className={`font-semibold ${d.margin_pct >= 30 ? 'text-green-600' : d.margin_pct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>{pct(d.margin_pct)}</span>
                        </div>
                        <div className="text-xs text-slate-muted">{fmt(d.revenue)} revenue</div>
                      </div>
                    ))}
                </div>
              </Panel>
              <Panel title="Highest Margin Products">
                <div className="space-y-2">
                  {margins.highest_margin.map((p, i) => (
                    <div key={p.item_code} className="flex items-start gap-2 text-sm font-body">
                      <span className="w-5 text-slate-muted font-semibold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate truncate">{p.name}</p>
                        <p className="text-xs text-slate-muted">{fmt(p.revenue)}</p>
                      </div>
                      <span className="text-green-600 font-semibold shrink-0">{pct(p.margin_pct)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Lowest Margin Products">
                <div className="space-y-2">
                  {margins.lowest_margin.map((p, i) => (
                    <div key={p.item_code} className="flex items-start gap-2 text-sm font-body">
                      <span className="w-5 text-slate-muted font-semibold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate truncate">{p.name}</p>
                        <p className="text-xs text-slate-muted">{fmt(p.revenue)}</p>
                      </div>
                      <span className="text-red-600 font-semibold shrink-0">{pct(p.margin_pct)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ── Inventory ── */}
        {!isLoading && active === 'inventory' && inventory && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Total Products"    value={inventory.summary.total_products} />
              <KPI label="Low Stock (<10)"   value={inventory.summary.low_stock_count} />
              <KPI label="Dead Stock"        value={inventory.summary.dead_stock_count} />
              <KPI label="Total Stock Value" value={fmt(inventory.summary.total_stock_value)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Low Stock Alerts">
                {inventory.low_stock.length === 0
                  ? <p className="text-sm font-body text-slate-muted">No low stock items.</p>
                  : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {inventory.low_stock.map(item => (
                        <div key={item.item_code} className="flex items-center justify-between text-sm font-body border-b border-border pb-2 last:border-0">
                          <div>
                            <p className="text-slate font-medium">{item.name}</p>
                            <p className="text-xs text-slate-muted">{item.category} · sold {item.sold_30d} in 30d</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <StatusBadge status={item.status} />
                            <p className="text-xs text-slate-muted mt-1">{item.stock} left</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </Panel>
              <Panel title="Dead Stock (>20 units, 0 sales in 30d)">
                {inventory.dead_stock.length === 0
                  ? <p className="text-sm font-body text-slate-muted">No dead stock items.</p>
                  : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {inventory.dead_stock.map(item => (
                        <div key={item.item_code} className="flex items-center justify-between text-sm font-body border-b border-border pb-2 last:border-0">
                          <div>
                            <p className="text-slate font-medium">{item.name}</p>
                            <p className="text-xs text-slate-muted">{item.category}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="font-semibold text-amber-600">{item.stock} units</p>
                            <p className="text-xs text-slate-muted">{fmt(item.stock_value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </Panel>
            </div>
            <Panel title="Stock Value by Category">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(inventory.by_category_value)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <div key={cat} className="text-sm font-body">
                      <p className="text-slate-muted capitalize text-xs">{cat.replace(/-/g, ' ')}</p>
                      <p className="font-semibold text-primary-dark">{fmt(val)}</p>
                    </div>
                  ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Customers ── */}
        {!isLoading && active === 'customers' && customers && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="New Customers (Month)"  value={customers.month.new_customers} />
              <KPI label="Avg Order Value"         value={fmt(customers.month.avg_order_value)} />
              <KPI label="Repeat Rate (90d)"       value={pct(customers.ninety_days.repeat_rate_pct)} sub={`${customers.ninety_days.repeat_customers} of ${customers.ninety_days.unique_customers}`} />
              <KPI label="At-Risk Customers"       value={customers.ninety_days.at_risk_count} sub="Bought 30–60d, not since" />
            </div>
            <Panel title="Top Customers by Revenue (90 days)">
              <div className="space-y-2">
                {customers.top_customers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm font-body border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-slate font-medium">{c.name}</p>
                      <p className="text-xs text-slate-muted">{c.orders} orders · last {fmtDate(c.last_order)}</p>
                    </div>
                    <span className="font-semibold text-primary-dark shrink-0 ml-2">{fmt(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Conversion ── */}
        {!isLoading && active === 'conversion' && conversion && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Conversion Rate"  value={pct(conversion.month.conversion_rate)} sub={`${conversion.month.paid_orders} paid`} />
              <KPI label="Abandon Rate"     value={pct(conversion.month.abandon_rate)}    sub={`${conversion.month.abandoned_orders} abandoned`} />
              <KPI label="Avg Order Value"  value={fmt(conversion.month.avg_order_value)} />
              <KPI label="Total Signals (30d)" value={Object.values(conversion.signals_30d).reduce((s, n) => s + n, 0)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Panel title="Signal Breakdown (30d)">
                <div className="space-y-2">
                  {Object.entries(conversion.signals_30d).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm font-body">
                      <span className="text-slate capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-primary-dark">{count}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Top Viewed Products (30d)">
                <div className="space-y-2">
                  {conversion.top_viewed_products.map((p, i) => (
                    <div key={p.item_code} className="flex justify-between text-sm font-body">
                      <span className="text-slate">{i + 1}. {p.item_code}</span>
                      <span className="font-semibold text-primary-dark">{p.views} views</span>
                    </div>
                  ))}
                  {conversion.top_viewed_products.length === 0 && (
                    <p className="text-sm text-slate-muted">No view signals yet.</p>
                  )}
                </div>
              </Panel>
              <Panel title="Top CRO Pages (30d)">
                <div className="space-y-2">
                  {conversion.top_cro_pages.map((p, i) => (
                    <div key={i} className="text-sm font-body">
                      <p className="text-slate truncate">{p.page_url || '/'}</p>
                      <p className="text-xs text-slate-muted">{p.sessions} sessions</p>
                    </div>
                  ))}
                  {conversion.top_cro_pages.length === 0 && (
                    <p className="text-sm text-slate-muted">No CRO signals yet.</p>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ── SEO ── */}
        {!isLoading && active === 'seo' && seo && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Products with SEO"   value={seo.coverage.total_products_with_seo} />
              <KPI label="Schema Coverage"     value={pct(seo.coverage.schema_coverage_pct)} sub={`${seo.coverage.with_schema} pages`} />
              <KPI label="With Description"    value={seo.coverage.with_description} />
              <KPI label="With Keywords"       value={seo.coverage.with_description} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel title="Top GSC Queries">
                {seo.gsc.top_queries.length === 0
                  ? <p className="text-sm font-body text-slate-muted">No GSC data yet.</p>
                  : (
                    <div className="space-y-2">
                      {seo.gsc.top_queries.slice(0, 8).map((q, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-body border-b border-border pb-1.5 last:border-0">
                          <span className="w-5 text-slate-muted shrink-0">{i + 1}</span>
                          <span className="flex-1 text-slate truncate">{q.query}</span>
                          <span className="text-xs text-slate-muted shrink-0">{q.impressions} imp</span>
                          <span className="text-xs font-semibold text-primary-dark shrink-0">{q.clicks} clk</span>
                        </div>
                      ))}
                    </div>
                  )}
              </Panel>
              <Panel title="Low CTR Opportunities">
                {seo.gsc.low_ctr_opportunities.length === 0
                  ? <p className="text-sm font-body text-slate-muted">No opportunities found.</p>
                  : (
                    <div className="space-y-2">
                      {seo.gsc.low_ctr_opportunities.map((q, i) => (
                        <div key={i} className="text-sm font-body border-b border-border pb-1.5 last:border-0">
                          <p className="text-slate">{q.query}</p>
                          <p className="text-xs text-slate-muted">CTR: <span className="text-red-600 font-semibold">{pct(q.ctr_pct)}</span> · {q.impressions} impressions</p>
                        </div>
                      ))}
                    </div>
                  )}
              </Panel>
            </div>
            {seo.trends.length > 0 && (
              <Panel title="Trending Keywords">
                <div className="flex flex-wrap gap-2">
                  {seo.trends.map((t, i) => (
                    <span key={i} className="inline-block bg-primary/10 text-primary text-xs font-body font-medium px-3 py-1 rounded-full">
                      {t.keyword}
                    </span>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Haya Intelligence ── */}
        {!isLoading && active === 'haya' && haya && (
          <div className="space-y-5">
            <Panel title="New Insights from Haya">
              {haya.records.length === 0
                ? <p className="text-sm font-body text-slate-muted">No new insights. Haya is monitoring.</p>
                : (
                  <div className="space-y-3">
                    {haya.records.map((insight, i) => (
                      <div key={i} className="border border-border rounded-lg p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-body font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                            {(insight.insight_type ?? 'insight').replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full ${
                            insight.priority === '1' ? 'bg-red-100 text-red-700' :
                            insight.priority === '2' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            P{insight.priority}
                          </span>
                          <span className="text-xs text-slate-muted ml-auto">{fmtDate(insight.created_at)}</span>
                        </div>
                        <p className="text-sm font-body text-slate leading-relaxed">{insight.insight_text}</p>
                      </div>
                    ))}
                  </div>
                )}
            </Panel>
          </div>
        )}

        {/* ── GEO/AEO ── */}
        {!isLoading && active === 'geo' && geo && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI label="Schema Coverage"    value={pct(geo.schema_pct)}       />
              <KPI label="Arabic Meta %"      value={pct(geo.arabic_pct)}       />
              <KPI label="Local Pages"        value={geo.local_page_count}      />
              <KPI label="Citations Found"    value={geo.citations.filter(c => c.cited).length + ' / ' + geo.citations.length} />
            </div>

            <Panel title="Brand Citation Audit">
              {geo.citations.length === 0
                ? <p className="text-sm font-body text-slate-muted">No citations recorded. Run the citations cron or trigger below.</p>
                : (
                  <div className="space-y-2">
                    {geo.citations.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${c.cited ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.cited ? '✓' : '✗'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-body font-medium text-slate truncate">{c.query}</p>
                          {c.cited && <p className="text-xs text-slate-muted">Position {c.position}</p>}
                          {c.context && <p className="text-xs text-slate-muted line-clamp-1">{c.context}</p>}
                        </div>
                        <span className="text-xs text-slate-muted shrink-0 ml-auto">{c.fetched_at}</span>
                      </div>
                    ))}
                  </div>
                )}
            </Panel>

            <Panel title="GEO Gap Insights">
              {geo.insights.length === 0
                ? <p className="text-sm font-body text-slate-muted">No GEO gap insights yet. Trigger the citations cron to generate.</p>
                : (
                  <div className="space-y-3">
                    {geo.insights.map((ins, i) => (
                      <div key={i} className="border border-border rounded-lg p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full ${
                            ins.priority === 'high'   ? 'bg-red-100 text-red-700' :
                            ins.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>{ins.priority}</span>
                        </div>
                        <p className="text-sm font-body text-slate leading-relaxed">{ins.insight_text}</p>
                        {ins.action_required && (
                          <p className="text-xs font-body text-primary mt-1">→ {ins.action_required}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </Panel>

            <Panel title="Trigger GEO Crons">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: '▶ Run Citations Check',  endpoint: '/api/nexa/citations' },
                  { label: '▶ Run Arabic Translate',  endpoint: '/api/nexa/translate' },
                  { label: '▶ Write Content',         endpoint: '/api/nexa/content'   },
                ].map(btn => (
                  <button key={btn.endpoint}
                    disabled={!!triggerBusy[btn.endpoint]}
                    onClick={async () => {
                      setTriggerBusy(prev => ({ ...prev, [btn.endpoint]: true }))
                      try {
                        await fetch(btn.endpoint, { headers: { 'x-admin-pin': pin } })
                        await fetchPanel('geo')
                      } catch {}
                      setTriggerBusy(prev => ({ ...prev, [btn.endpoint]: false }))
                    }}
                    className="text-sm font-body font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors px-4 py-2 rounded-lg disabled:opacity-40"
                  >
                    {triggerBusy[btn.endpoint] ? 'Running...' : btn.label}
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Agent Status ── */}
        {!isLoading && active === 'agents' && agents && (
          <div className="space-y-5">
            <Panel title="Agent Schedule & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agents.agents.map(agent => (
                  <div key={agent.key} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-body font-semibold text-sm text-primary-dark">{agent.label}</p>
                        <p className="text-xs text-slate-muted mt-0.5">{agent.schedule}</p>
                      </div>
                      <span className="text-xs font-body bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                        {agent.insights_this_week} insights / 7d
                      </span>
                    </div>
                    <button
                      disabled={triggerBusy[agent.key]}
                      onClick={async () => {
                        setTriggerBusy(prev => ({ ...prev, [agent.key]: true }))
                        try {
                          await fetch(agent.endpoint, {
                            method: 'POST',
                            headers: { 'x-admin-pin': pin },
                          })
                          await fetchPanel('agents')
                        } catch {}
                        setTriggerBusy(prev => ({ ...prev, [agent.key]: false }))
                      }}
                      className="w-full text-sm font-body font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors px-3 py-2 rounded-lg disabled:opacity-40"
                    >
                      {triggerBusy[agent.key] ? 'Running...' : `▶ Run ${agent.label}`}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Active Promotions">
              {agents.promotions.length === 0
                ? <p className="text-sm font-body text-slate-muted">No active promotions.</p>
                : (
                  <div className="space-y-2">
                    {agents.promotions.map((p, i) => {
                      const endsAt  = new Date(p.ends_at)
                      const msLeft  = endsAt.getTime() - Date.now()
                      const hrsLeft = Math.max(0, Math.round(msLeft / 3600000))
                      return (
                        <div key={i} className="flex items-center justify-between text-sm font-body border-b border-border pb-2 last:border-0">
                          <div>
                            <p className="font-medium text-slate">{p.item_code}</p>
                            <p className="text-xs text-slate-muted">{p.promo_discount}% off · expires {fmtDate(p.ends_at)}</p>
                          </div>
                          <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            hrsLeft < 6 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {hrsLeft < 1 ? 'Expiring' : `${hrsLeft}h left`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
            </Panel>
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Page entry ─────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [pin, setPin] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('hs_admin_pin')
    if (saved) setPin(saved)
  }, [])

  if (!pin) return <AuthScreen onAuth={setPin} />
  return <Dashboard pin={pin} />
}
