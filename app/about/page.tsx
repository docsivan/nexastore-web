import type { Metadata } from 'next'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About Us' }

const MVV = [
  {
    num: '01',
    title: 'Mission',
    desc: 'Empower businesses worldwide with world-class medical supplies at competitive prices, backed by AI intelligence.',
  },
  {
    num: '02',
    title: 'Vision',
    desc: 'To be the leading digital-first healthcare procurement platform across the Gulf, connecting trusted global manufacturers with local healthcare providers.',
  },
  {
    num: '03',
    title: 'Values',
    desc: 'Clinical integrity, supply chain transparency, regulatory compliance, and an uncompromising commitment to customer satisfaction and patient safety.',
  },
]

const EXPERTISE = [
  {
    title: 'ISO 13485:2016 Certified',
    desc: 'Our quality management system meets international standards for medical device distribution.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2L4 6v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V6l-8-4z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    title: 'Quality Assured',
    desc: "All products meet international quality and safety standards.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 12h6M9 16h4"/>
      </svg>
    ),
  },
  {
    title: 'Global Manufacturer Partnerships',
    desc: 'Direct partnerships with leading European, American and Asian manufacturers ensuring product authenticity.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9M3 12h18"/>
      </svg>
    ),
  },
  {
    title: '100+ CME Lectures Delivered',
    desc: 'We invest in healthcare education through educational content and expert guides.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 14l-8-4 8-4 8 4-8 4z"/>
        <path d="M4 10v5c0 2.5 3.5 4 8 4s8-1.5 8-4v-5"/>
        <path d="M20 10v4"/>
      </svg>
    ),
  },
  {
    title: 'Digital-First Operations',
    desc: 'ERP-integrated workflows, B2B ordering portal, and fast global dispatch capabilities.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    title: 'Dedicated Clinical Support',
    desc: 'Our team includes clinical professionals who can advise on infection control and product selection.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
  },
]

const STATS = [
  { value: '500+', label: 'Products Listed' },
  { value: '200+', label: 'Facilities Served' },
  { value: '10+',  label: 'Years Experience' },
  { value: '25%',  label: 'YoY Growth' },
]

// Border classes for 2-col mobile → 4-col desktop ruled grid
const STAT_BORDERS = [
  'border-r border-b md:border-b-0 border-border',
  'border-b md:border-b-0 md:border-r border-border',
  'border-r border-border',
  '',
]

export default function AboutPage() {
  return (
    <div className="container-page py-8 pb-20 max-w-4xl">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'About Us' }]} />

      {/* Hero */}
      <div className="bg-primary rounded-card p-8 md:p-12 text-white mb-12 mt-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="0.6"/>
            <circle cx="100" cy="100" r="55" stroke="white" strokeWidth="0.6"/>
            <circle cx="100" cy="100" r="28" stroke="white" strokeWidth="0.6"/>
            <line x1="20" y1="100" x2="180" y2="100" stroke="white" strokeWidth="0.6"/>
            <line x1="100" y1="20" x2="100" y2="180" stroke="white" strokeWidth="0.6"/>
          </svg>
        </div>
        <div className="relative">
          <p className="overline-label text-accent-light mb-3">NexaStore — Our Story</p>
          <h1 className="font-heading font-bold text-3xl md:text-4xl mb-4 leading-tight text-white">
            10+ Years of Healthcare<br />Procurement Excellence
          </h1>
          <div className="w-10 h-px bg-accent mb-5" />
          <p className="font-body text-white/70 text-sm leading-relaxed max-w-xl">
            NexaStore was founded with a single mission: to give businesses worldwide
            reliable, certified access to the infection control, dental, and medical consumables they need
            to deliver excellent patient care.
          </p>
        </div>
      </div>

      {/* Mission / Vision / Values — numbered ruled grid */}
      <div className="mb-12">
        <p className="overline-label mb-6">What We Stand For</p>
        <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-card overflow-hidden">
          {MVV.map((item, idx) => (
            <div
              key={item.num}
              className={`p-6 md:p-7 bg-white${idx < 2 ? ' border-b md:border-b-0 md:border-r border-border' : ''}`}
            >
              <p
                className="font-heading font-bold text-5xl leading-none select-none mb-5"
                style={{ color: 'rgba(13,13,13,0.07)' }}
              >
                {item.num}
              </p>
              <p className="overline-label mb-2">{item.title}</p>
              <p className="font-body text-sm text-slate leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expertise */}
      <div className="mb-12">
        <p className="overline-label mb-6">Why Healthcare Professionals Trust Us</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EXPERTISE.map((item) => (
            <div key={item.title} className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-[3px] bg-primary/5 flex items-center justify-center flex-shrink-0 mt-0.5 text-primary transition-colors group-hover:bg-primary/10">
                {item.icon}
              </div>
              <div>
                <h4 className="font-heading font-semibold text-sm text-primary-dark">{item.title}</h4>
                <p className="font-body text-xs text-slate-muted mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats — ruled grid */}
      <div className="mb-12 border border-border rounded-card overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, idx) => (
            <div key={stat.label} className={`p-6 md:p-8 text-center bg-white ${STAT_BORDERS[idx]}`}>
              <p className="font-heading font-bold text-3xl md:text-4xl text-primary mb-1 leading-none">
                {stat.value}
              </p>
              <p className="overline-label mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="font-heading font-bold text-xl text-primary-dark mb-3">
          Ready to streamline your procurement?
        </h2>
        <p className="font-body text-sm text-slate-muted mb-6">
          Browse our full product catalogue or contact us for a customised B2B account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products" className="btn-primary text-sm text-center">Browse Products</Link>
          <Link href="/contact" className="btn-outline text-sm text-center">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
