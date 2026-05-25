import Link from 'next/link'
import { CATEGORIES } from '@/lib/mockData'

const CATEGORY_CONFIG: Record<string, {
  from: string
  to: string
  icon: React.ReactNode
}> = {
  'moisturisers': {
    from: '#C67B99', to: '#9B3E6B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2C8 2 4 6 4 10c0 5 4 9 8 10 4-1 8-5 8-10 0-4-4-8-8-8z"/>
        <path d="M12 6v4M10 8h4"/>
      </svg>
    ),
  },
  'serums': {
    from: '#A855F7', to: '#7C3AED',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M9 3h6l1 4H8L9 3z"/>
        <path d="M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7"/>
        <path d="M10 11h4M10 14h2"/>
      </svg>
    ),
  },
  'cleansers': {
    from: '#3B82F6', to: '#1D4ED8',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M8 2h8l2 6H6L8 2z"/>
        <path d="M6 8v10a2 2 0 002 2h8a2 2 0 002-2V8"/>
        <path d="M12 12c0 1.7-1.3 3-3 3"/>
      </svg>
    ),
  },
  'sunscreen': {
    from: '#F59E0B', to: '#D97706',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
      </svg>
    ),
  },
  'treatments': {
    from: '#10B981', to: '#059669',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
        <path d="M12 7V5a2 2 0 00-2-2H8"/>
        <path d="M8 12h8M12 10v4"/>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat, i) => {
          const cfg = CATEGORY_CONFIG[cat.id] ?? CATEGORY_CONFIG['cleansers']
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
