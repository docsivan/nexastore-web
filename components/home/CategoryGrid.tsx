import Link from 'next/link'
import { CATEGORIES } from '@/lib/mockData'

const CATEGORY_CONFIG: Record<string, {
  from: string
  to: string
  icon: React.ReactNode
}> = {
  'infection-control': {
    from: '#2563eb', to: '#1e40af',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2L4 6v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V6l-8-4z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  'dental-supplies': {
    from: '#0d9488', to: '#0f766e',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M8 3c-2 0-4 2-4 5 0 4 2 7 4 9 .8 1.5 1.5 3 3 3s2.2-1.5 3-3c.8 1.5 1.5 3 3 3s2.2-1.5 3-3c2-2 4-5 4-9 0-3-2-5-4-5-1.5 0-2.5.8-3 1.5C15.5 3.8 14.5 3 13 3s-2.5.8-3 1.5C9.5 3.8 9.5 3 8 3z"/>
      </svg>
    ),
  },
  'ppe': {
    from: '#f97316', to: '#ea580c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/>
        <path d="M8.5 12.5l2.5 2.5 4.5-4.5"/>
      </svg>
    ),
  },
  'diagnostics': {
    from: '#9333ea', to: '#7c3aed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3.5 3.5"/>
      </svg>
    ),
  },
  'sterilization': {
    from: '#16a34a', to: '#15803d',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="5" y="8" width="14" height="12" rx="1"/>
        <path d="M8 8V6a4 4 0 018 0v2"/>
        <circle cx="12" cy="14" r="2"/>
      </svg>
    ),
  },
  'medical-devices': {
    from: '#475569', to: '#334155',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M9 3H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1v-5"/>
        <path d="M14 3h7v7"/>
        <path d="M21 3l-9 9"/>
      </svg>
    ),
  },
}

export default function CategoryGrid() {
  return (
    <section className="container-page py-14">
      {/* Section header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="overline-label mb-1.5">Browse</p>
          <h2 className="font-heading font-bold text-2xl text-primary-dark">
            Shop by Category
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:flex items-center gap-1.5 text-xs font-body font-medium text-primary hover:text-primary-light transition-colors"
        >
          View all products
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map((cat, i) => {
          const cfg = CATEGORY_CONFIG[cat.id] ?? CATEGORY_CONFIG['medical-devices']
          return (
            <Link
              key={cat.id}
              href={`/products?category=${cat.id}`}
              className="group flex flex-col overflow-hidden rounded-[4px] border border-border bg-white hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Gradient icon bar */}
              <div
                className="h-20 flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}
              >
                <div className="opacity-90 group-hover:scale-110 transition-transform duration-200">
                  {cfg.icon}
                </div>
              </div>

              {/* Label */}
              <div className="px-3 py-3 flex-1">
                <p className="font-heading font-semibold text-xs text-primary-dark leading-tight group-hover:text-primary transition-colors">
                  {cat.label}
                </p>
                <p className="overline-label mt-1">
                  {cat.productCount} products
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
