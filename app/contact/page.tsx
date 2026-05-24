import type { Metadata } from 'next'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import { NEXA_EMAIL, NEXA_PHONE, NEXA_WHATSAPP, getWhatsAppUrl } from '@/lib/utils'

export const metadata: Metadata = { title: 'Contact Us' }

export default function ContactPage() {
  return (
    <div className="container-page py-8 pb-16 max-w-5xl">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

      <div className="mt-4 mb-8">
        <p className="font-body text-xs text-accent-dark font-semibold tracking-widest uppercase mb-1">Get in Touch</p>
        <h1 className="font-heading font-bold text-3xl text-primary-dark">Contact NexaStore</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3 card p-6">
          <h2 className="font-heading font-semibold text-lg text-primary-dark mb-5">Send us a message</h2>
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">Full Name *</label>
                <input type="text" className="input-field" placeholder="John Smith" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">Email *</label>
                <input type="email" className="input-field" placeholder="ahmed@clinic.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">Phone</label>
                <input type="tel" className="input-field" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">Organisation</label>
                <input type="text" className="input-field" placeholder="Hospital / Clinic name" />
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-slate mb-1.5">Subject *</label>
              <select className="input-field">
                <option value="">Select a subject</option>
                <option>Product Enquiry</option>
                <option>B2B / Bulk Order</option>
                <option>Order Support</option>
                <option>Technical Complaint</option>
                <option>Partnership Opportunity</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-slate mb-1.5">Message *</label>
              <textarea rows={5} className="input-field resize-none" placeholder="Describe your enquiry, products of interest, or any specific requirements…" />
            </div>
            <button type="submit" className="btn-primary text-sm">
              Send Message
            </button>
          </form>
        </div>

        {/* Contact info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-primary-dark mb-4 uppercase tracking-wide">Contact Details</h3>
            <div className="flex flex-col gap-4">
              {[
                { icon: '📞', label: 'Phone', value: NEXA_PHONE, href: `tel:${NEXA_PHONE}` },
                { icon: '✉️', label: 'Email', value: NEXA_EMAIL, href: `mailto:${NEXA_EMAIL}` },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-body text-[10px] text-slate-muted uppercase tracking-wider">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="font-body text-sm font-medium text-primary hover:text-primary-light transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <p className="font-body text-sm text-slate whitespace-pre-line">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="card p-5 bg-[#E8F5E9] border-[#A5D6A7]">
            <p className="font-heading font-semibold text-sm text-[#2E7D32] mb-1">Prefer WhatsApp?</p>
            <p className="font-body text-xs text-[#D4891A] mb-3">Get a faster response via WhatsApp during business hours (8AM–5PM, Sun–Thu).</p>
            <a
              href={getWhatsAppUrl(NEXA_WHATSAPP, 'Hello, I have an enquiry about NexaStore.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-heading font-semibold px-4 py-2 rounded-btn hover:bg-[#22C55E] transition-colors text-sm"
            >
              Chat on WhatsApp
            </a>
          </div>

          {/* Business hours */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-primary-dark mb-3 uppercase tracking-wide">Business Hours</h3>
            <div className="flex flex-col gap-1.5 font-body text-sm">
              {[
                { day: 'Sunday – Thursday', time: '8:00 AM – 5:00 PM' },
                { day: 'Saturday', time: '9:00 AM – 1:00 PM' },
                { day: 'Friday', time: 'Closed' },
              ].map((h) => (
                <div key={h.day} className="flex justify-between">
                  <span className="text-slate">{h.day}</span>
                  <span className={`font-medium ${h.time === 'Closed' ? 'text-red-500' : 'text-primary'}`}>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
