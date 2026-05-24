const BADGES = [
  { label: 'AI-Powered Commerce', href: '#' },
  { label: 'Fast Global Delivery', href: '#' },
  { label: 'Secure Payments', href: '#' },
  { label: 'Nexa AI Search', href: '#' },
]

export default function ComplianceStrip() {
  return (
    <section className="py-8" style={{ background: '#F5F5F5' }}>
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="font-body text-xs text-slate-muted uppercase tracking-widest mb-4">
          Platform Features
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {BADGES.map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-white shadow-card text-xs font-heading font-semibold text-primary-dark"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
