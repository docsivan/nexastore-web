'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCartContext } from '@/context/CartContext'
import { useLanguageContext } from '@/context/LanguageContext'
import { useSearch } from '@/hooks/useSearch'
import { Product } from '@/lib/types'
import { adaptAirtableProducts } from '@/lib/adapters'
import LanguageSwitcher from './LanguageSwitcher'
import PowerSearchDropdown from '@/components/products/PowerSearchDropdown'
import { getCustomerSession } from '@/lib/session'

export default function Navbar() {
  const { cart }                    = useCartContext()
  const { t }                       = useLanguageContext()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [products,   setProducts]   = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((json) => { if (json.data) setProducts(adaptAirtableProducts(json.data)) })
      .catch(() => {})
  }, [])

  const [customerName, setCustomerName] = useState<string | null>(null)

  useEffect(() => {
    const s = getCustomerSession()
    setCustomerName(s ? s.customer_name.split(' ')[0] : null)
  }, [])

  const { query, results, isSearching, hasSearched, isAI, search, clearSearch } = useSearch(products)

  return (
    <header className="sticky top-0 z-40 bg-white shadow-nav">
      <div className="bg-primary">
        <div className="container-page flex items-center justify-between py-1.5 text-xs text-primary-50 font-body">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 opacity-60 flex-shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H3V6a1 1 0 011-1h9a1 1 0 011 1v4M9 17h6m-6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm-2-5h4l2 3v2h-6V12z"/></svg>
            Commerce. Powered by Intelligence.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-white transition-colors hidden sm:block">About</Link>
            <Link href="/contact" className="hover:text-white transition-colors hidden sm:block">Contact</Link>
            <Link href="/admin" className="hover:text-white transition-colors hidden sm:block opacity-40 hover:opacity-80 text-xs">Staff</Link>
            {customerName ? (
              <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 bg-white text-primary hover:bg-white/90 transition-all font-body font-semibold text-xs px-3 py-1 rounded-full shadow-sm">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {customerName}
              </Link>
            ) : (
              <Link href="/login" className="hidden sm:flex items-center gap-1.5 bg-white text-primary hover:bg-white/90 transition-all font-body font-semibold text-xs px-3 py-1 rounded-full shadow-sm">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                My Account
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <nav className="container-page">
        <div className="flex items-center h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-4">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-accent font-heading font-bold text-base">N</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-heading font-bold text-primary text-lg leading-tight">NexaStore</p>
              <p className="font-body text-[10px] leading-tight tracking-widest uppercase" style={{color:'#F5A623'}}>AI Commerce</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 flex-1">
            <Link href="/" className="font-body text-sm text-slate hover:text-primary transition-colors font-medium">{t.nav.home}</Link>
            <Link href="/products" className="font-body text-sm text-slate hover:text-primary transition-colors font-medium">{t.nav.products}</Link>
            <Link href="/guides" className="font-body text-sm text-slate hover:text-primary transition-colors font-medium">Guides</Link>
            <Link href="/quick-order" className="font-body text-sm text-accent-dark hover:text-accent transition-colors font-semibold">Quick Order</Link>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search products…"
                value={query}
                onChange={(e) => search(e.target.value)}
                onFocus={(e) => { if (e.target.value) search(e.target.value) }}
                onBlur={() => setTimeout(clearSearch, 200)}
                className="input-field text-sm w-52 lg:w-72 pl-9 pr-4"
                autoComplete="off"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {query && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-muted hover:text-slate text-sm">✕</button>
              )}
              <PowerSearchDropdown results={results} isSearching={isSearching} hasSearched={hasSearched} isAI={isAI} onClose={clearSearch} query={query} />
            </div>

            <button className="md:hidden p-2 rounded-btn hover:bg-surface transition-colors" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
              <svg className="w-5 h-5 text-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <Link href={customerName ? '/dashboard' : '/login'} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-btn bg-primary text-white hover:bg-primary-light transition-all duration-200 text-sm font-body font-semibold shadow-sm hover:shadow">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>{customerName ? customerName : 'My Account'}</span>
            </Link>
            <Link href="/cart" className="relative p-2 rounded-btn hover:bg-surface transition-colors">
              <svg className="w-5 h-5 text-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-heading font-bold min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center px-0.5">
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </Link>

            <button className="md:hidden p-2 rounded-btn hover:bg-surface transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              <svg className="w-5 h-5 text-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="md:hidden pb-3 relative">
            <input type="text" placeholder="Search products…" value={query}
              onChange={(e) => search(e.target.value)}
              className="input-field text-sm pl-9 w-full" autoFocus autoComplete="off" />
            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <PowerSearchDropdown results={results} isSearching={isSearching} hasSearched={hasSearched} isAI={isAI} onClose={() => { clearSearch(); setSearchOpen(false) }} query={query} />
          </div>
        )}

        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 flex flex-col gap-1">
            {[
              { label: t.nav.home, href: '/' },
              { label: t.nav.products, href: '/products' },
              { label: 'Guides', href: '/guides' },
              { label: 'Quick Order', href: '/quick-order' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
              { label: customerName ? `${customerName}'s Account` : 'Sign In', href: customerName ? '/dashboard' : '/login' },
              { label: 'Staff Admin', href: '/admin' },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="px-2 py-2 font-body text-sm text-slate hover:text-primary hover:bg-surface rounded transition-colors"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  )
}
