import Link from 'next/link'
import Image from 'next/image'
import { NEXA_EMAIL, NEXA_PHONE, NEXA_WHATSAPP, getWhatsAppUrl } from '@/lib/utils'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-primary-dark text-primary-50 mt-auto">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-white/10 flex items-center justify-center" style={{borderRadius:'3px'}}>
                <span style={{color:'#F5A623'}} className="font-heading font-bold text-base">N</span>
              </div>
              <div>
                <p className="font-heading font-bold text-white text-lg leading-tight">NexaStore</p>
                <p style={{color:'#F5A623'}} className="font-body text-[10px] tracking-widest uppercase">AI Commerce</p>
              </div>
            </div>
            <p className="font-body text-sm text-primary-50/70 leading-relaxed mb-4">
              Universal AI commerce platform. Intelligent, fast, and built for scale.
            </p>
            <div className="flex flex-col gap-2 text-sm font-body">
              <a href={`tel:${NEXA_PHONE}`} className="flex items-center gap-2 text-primary-50/70 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0 opacity-60"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.08 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg> {NEXA_PHONE}
              </a>
              <a href={`mailto:${NEXA_EMAIL}`} className="flex items-center gap-2 text-primary-50/70 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0 opacity-60"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg> {NEXA_EMAIL}
              </a>
              <a
                href={getWhatsAppUrl(NEXA_WHATSAPP, 'Hello, I need assistance with my order.')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-primary-50/70 hover:text-white transition-colors"
              >
                WhatsApp Support
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="overline-label text-white/50 mb-4 block">Quick Links</h4>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'All Products', href: '/products' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Track Order', href: '/order-confirmation' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-body text-sm text-primary-50/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="overline-label text-white/50 mb-4 block">Categories</h4>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Skincare',         id: 'Skincare' },
                { label: 'Serums & Actives', id: 'Serums & Actives' },
                { label: 'Sun Care',         id: 'Sun Care' },
                { label: 'Cosmetics',        id: 'Cosmetics' },
                { label: 'Body & Hair',      id: 'Body & Hair' },
              ].map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/products?category=${encodeURIComponent(cat.id)}`}
                    className="font-body text-sm text-primary-50/70 hover:text-white transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform + Legal */}
          <div>
            <h4 className="overline-label text-white/50 mb-4 block">Platform</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {['AI-Powered', 'Fast Delivery', 'Secure Payments', 'Global Commerce'].map((feat) => (
                <span key={feat} className="px-2.5 py-1 bg-white/10 text-[11px] font-body text-primary-50/80" style={{borderRadius:'3px'}}>
                  {feat}
                </span>
              ))}
            </div>
            <h4 className="font-heading font-semibold text-white text-sm mb-3 uppercase tracking-wider">Legal</h4>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-body text-sm text-primary-50/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-page py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-body text-xs text-primary-50/50">
            © {year} NexaStore. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Image src="https://placehold.co/40x25/FFFFFF/0D0D0D?text=VISA" alt="Visa" width={40} height={25} className="opacity-50 hover:opacity-80 transition-opacity" />
            <Image src="https://placehold.co/40x25/FFFFFF/0D0D0D?text=MC" alt="Mastercard" width={40} height={25} className="opacity-50 hover:opacity-80 transition-opacity" />
            <Image src="https://placehold.co/60x25/FFFFFF/0D0D0D?text=PayTabs" alt="PayTabs" width={60} height={25} className="opacity-50 hover:opacity-80 transition-opacity" />
          </div>
        </div>
      </div>
    </footer>
  )
}
