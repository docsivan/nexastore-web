import type { Metadata } from 'next'
import Breadcrumbs from '@/components/global/Breadcrumbs'

export const metadata: Metadata = { title: 'Terms & Conditions' }

export default function TermsPage() {
  return (
    <div className="container-page py-8 pb-16 max-w-3xl">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Terms & Conditions' }]} />
      <h1 className="font-heading font-bold text-3xl text-primary-dark mt-4 mb-2">Terms & Conditions</h1>
      <p className="font-body text-xs text-slate-muted mb-8">Last updated: January 2025</p>

      <div className="card p-6 md:p-8 flex flex-col gap-6 font-body text-sm text-slate leading-relaxed">
        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing and using nexastore.io, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website. These terms apply to all users, including browsers, customers, vendors, and content contributors.',
          },
          {
            title: '2. Products and Pricing',
            body: 'All prices are displayed in USD and are inclusive of applicable taxes. Prices are subject to change without notice. We reserve the right to limit quantities, discontinue products, and modify product specifications at any time.',
          },
          {
            title: '3. Orders and Payment',
            body: 'Orders are subject to acceptance and product availability. We reserve the right to refuse or cancel any order. Payment must be received in full before dispatch. We accept Visa, Mastercard, and other payment methods supported by PayTabs. All transactions are processed securely.',
          },
          {
            title: '4. Shipping and Delivery',
            body: 'Orders placed before 1:00 PM (Sunday–Thursday) are dispatched same day within Muscat. Delivery to other governorates may take 2–3 business days. Free delivery may apply for qualifying orders.',
          },
          {
            title: '5. Returns and Refunds',
            body: 'Products may be returned within 14 days of delivery, provided they are unopened, in original packaging, and accompanied by proof of purchase. Sterile, single-use, and cold-chain products cannot be returned unless defective. Refunds are processed within 7 business days of return receipt.',
          },
          {
            title: '6. Product Use and Medical Disclaimer',
            body: 'Products sold by NexaStore are intended for use by qualified healthcare professionals. We do not provide medical advice. Product descriptions are for reference only. Always consult relevant clinical guidelines and manufacturer instructions before use. NexaStore is not liable for outcomes arising from product misuse.',
          },
          {
            title: '7. Intellectual Property',
            body: 'All content on this website, including text, graphics, logos, and images, is the property of NexaStore or its content suppliers and is protected by intellectual property laws. Unauthorised use is strictly prohibited.',
          },
          {
            title: '8. Governing Law',
            body: 'These Terms and Conditions are governed by and construed in accordance with the applicable law. Any disputes shall be subject to the jurisdiction of the applicable courts.',
          },
        ].map((section) => (
          <section key={section.title}>
            <h2 className="font-heading font-semibold text-primary-dark text-base mb-2">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
