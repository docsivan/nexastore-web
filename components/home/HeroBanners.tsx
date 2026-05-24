'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SLIDES = [
  {
    overline: 'Sultanate of Oman · ISO 13485 · MOH Compliant',
    headline: 'Premium Healthcare Supplies',
    subtext: 'Verified stock. Same-day dispatch in Muscat. Expiry transparency on every product.',
    cta: 'Browse Catalogue',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&h=600&fit=crop&auto=format',
    trust: ['Verified Stock', 'MOH Compliant', 'Expiry Guaranteed', 'Bulk Pricing'],
  },
  {
    overline: 'Dental Procurement · GCC Leading Brands',
    headline: 'Complete Dental Solutions',
    subtext: 'Instruments, consumables and sterilization equipment from world-leading manufacturers.',
    cta: 'View Dental Range',
    href: '/products?category=Dental+Supplies',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&h=600&fit=crop&auto=format',
    trust: ['CE Certified', 'ISO 13485', 'Direct Import', 'Volume Pricing'],
  },
  {
    overline: 'Infection Control · PPE · Sterilization',
    headline: 'Infection Control Essentials',
    subtext: 'PPE, disinfectants and sterilization supplies meeting MOH Oman clinical standards.',
    cta: 'Browse IPC Range',
    href: '/products?category=Infection+Control',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1600&h=600&fit=crop&auto=format',
    trust: ['MOH Standard', 'EN Certified', 'Same-Day Stock', 'Clinical Grade'],
  },
]

const TRUST_ICONS = [
  <svg key="a" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7 3.5-1 6-3.5 6-7V4L8 1z"/><path d="M5.5 8l1.5 1.5 3-3"/></svg>,
  <svg key="b" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><path d="M6 2H4a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1h-2M6 2a1 1 0 001 1h2a1 1 0 001-1M6 2a1 1 0 011-1h2a1 1 0 011 1M6 7h4M6 10h2"/></svg>,
  <svg key="c" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><circle cx="8" cy="8" r="6"/><path d="M8 4v4M6.5 9.5l1.5 1.5"/></svg>,
  <svg key="d" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><path d="M2 6h12M5 3l-2 3v6a1 1 0 001 1h8a1 1 0 001-1V6l-2-3z"/></svg>,
]

export default function HeroBanners() {
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next])

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'clamp(320px, 42vw, 520px)' }}>
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? 'auto' : 'none' }}
        >
          {/* Background image */}
          <Image
            src={slide.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority={i === 0}
            onLoad={() => setLoaded((p) => ({ ...p, [i]: true }))}
            style={{ opacity: loaded[i] ? 1 : 0, transition: 'opacity 0.4s' }}
          />
          {!loaded[i] && (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #001a3a 100%)' }} />
          )}
          {/* Overlay — stronger on left for text legibility */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,20,50,0.88) 0%, rgba(0,20,50,0.75) 45%, rgba(0,20,50,0.35) 100%)' }} />
          {/* Top accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-px bg-accent opacity-70" />

          {/* Content */}
          <div className="relative h-full flex items-center px-6 md:px-16">
            <div className="max-w-xl w-full">
              {/* Overline */}
              <p className="overline-label text-white/50 mb-3">{slide.overline}</p>

              {/* Headline */}
              <h1 className="font-heading font-bold text-white leading-tight mb-3" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
                {slide.headline}
              </h1>

              {/* Accent rule */}
              <div className="w-8 h-px bg-accent mb-4" />

              {/* Subtext */}
              <p className="font-body text-white/65 leading-relaxed mb-6 text-sm md:text-base max-w-md">
                {slide.subtext}
              </p>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-3 mb-7">
                {slide.trust.map((t, idx) => (
                  <div key={t} className="flex items-center gap-1.5 text-white/60">
                    <span className="text-accent">{TRUST_ICONS[idx]}</span>
                    <span className="font-body text-xs font-medium">{t}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 bg-white text-primary hover:bg-white/90 active:scale-95 transition-all px-7 py-3 font-heading font-semibold text-sm"
                style={{ borderRadius: '3px' }}
              >
                {slide.cta}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Slide counter — top right */}
          <div className="absolute top-5 right-6 flex items-center gap-2 z-10">
            <span className="overline-label text-white/60">{String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</span>
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors z-10" style={{ borderRadius: '3px' }} aria-label="Previous slide">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors z-10" style={{ borderRadius: '3px' }} aria-label="Next slide">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      {/* Progress bar — bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10 z-10">
        <div
          className="h-full bg-accent transition-all duration-700"
          style={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
