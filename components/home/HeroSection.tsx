import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative bg-primary overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,
          backgroundSize: '50px 50px',
        }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-light opacity-90" />

      <div className="container-page relative z-10 py-20 lg:py-28">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-xs font-body font-medium mb-6 backdrop-blur-sm border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            ISO 13485 Certified · MOH Compliant
          </div>

          <h1 className="font-heading font-bold text-4xl lg:text-5xl xl:text-6xl text-white leading-tight mb-4">
            Professional
            <br />
            <span className="text-accent-light">Healthcare</span> Supplies
          </h1>

          <p className="font-body text-base lg:text-lg text-white/75 leading-relaxed max-w-xl mb-8">
            Trusted procurement partner for infection control, dental, and medical consumables
            across the  10+ years of clinical expertise.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-heading font-semibold px-7 py-3 rounded-btn hover:bg-primary-50 transition-colors"
            >
              Shop Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/products?category=moisturisers"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-heading font-semibold px-7 py-3 rounded-btn hover:bg-white/10 transition-colors"
            >
              Infection Control
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-12 pt-8 border-t border-white/15">
            {[
              { value: '500+', label: 'Products' },
              { value: '200+', label: 'Healthcare Facilities' },
              { value: '10+', label: 'Years Experience' },
              { value: '24h', label: 'Order Dispatch' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading font-bold text-2xl text-white">{stat.value}</p>
                <p className="font-body text-xs text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
