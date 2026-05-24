import type { Metadata } from 'next'
import Link from 'next/link'
import BulkOrderGrid from '@/components/orders/BulkOrderGrid'
import Breadcrumbs from '@/components/global/Breadcrumbs'

export const metadata: Metadata = { title: 'Quick Order — Bulk Procurement' }

export default function QuickOrderPage() {
  return (
    <div className="container-page py-6 pb-16 max-w-5xl">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Quick Order' }]} />

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary rounded-full px-3 py-1 text-xs font-heading font-semibold mb-2">
            B2B Procurement Tool
          </div>
          <h1 className="font-heading font-bold text-3xl text-primary-dark">Quick-Order Grid</h1>
          <p className="font-body text-slate-muted text-sm mt-1 max-w-xl">
            Built for procurement officers. Enter item codes or SKUs, set quantities, and add an entire order to cart in seconds — no page reloads.
          </p>
        </div>
        <Link href="/products" className="btn-outline text-sm hidden sm:flex items-center gap-1.5 flex-shrink-0">
          Browse Catalogue
        </Link>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { step: '1', icon: 'keyboard', title: 'Type name, SKU or item code', desc: 'Fuzzy search — finds as you type' },
          { step: '2', icon: 'qty', title: 'Tab to set quantity',    desc: 'Tab moves to the next row' },
          { step: '3', icon: 'cart', title: 'Add all to cart',        desc: 'One click, entire order added' },
        ].map((item) => (
          <div key={item.step} className="card p-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-white font-heading font-bold text-xs flex items-center justify-center flex-shrink-0">
              {item.step}
            </div>
            <div>
              
              <p className="font-heading font-semibold text-sm text-primary-dark">{item.title}</p>
              <p className="font-body text-xs text-slate-muted mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Order Grid */}
      <BulkOrderGrid />

      {/* Need help */}
      <div className="mt-8 card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-heading font-semibold text-sm text-primary-dark">Need a custom order or quotation?</p>
          <p className="font-body text-xs text-slate-muted mt-0.5">
            Our procurement team can assist with large volumes, special pricing, or delivery scheduling.
          </p>
        </div>
        <Link href="/contact" className="btn-outline text-sm flex-shrink-0">
          Request a Quote
        </Link>
      </div>
    </div>
  )
}
