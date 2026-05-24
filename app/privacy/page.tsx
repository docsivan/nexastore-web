import type { Metadata } from 'next'
import Breadcrumbs from '@/components/global/Breadcrumbs'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="container-page py-8 pb-16 max-w-3xl">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
      <h1 className="font-heading font-bold text-3xl text-primary-dark mt-4 mb-2">Privacy Policy</h1>
      <p className="font-body text-xs text-slate-muted mb-8">Last updated: January 2025</p>

      <div className="card p-6 md:p-8 flex flex-col gap-6 font-body text-sm text-slate leading-relaxed">
        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide directly to us, including your name, email address, phone number, company name, and delivery address when you place an order, create an account, or contact us. We also collect information automatically when you use our website, such as your IP address, browser type, and pages visited.',
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use the information we collect to process and fulfill your orders, communicate with you about your orders and our products, send promotional communications (with your consent), improve our website and services, and comply with legal obligations under Omani law.',
          },
          {
            title: '3. Information Sharing',
            body: 'We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our website (such as payment processors like PayTabs), delivery partners within Oman, and when required by law or governmental authority.',
          },
          {
            title: '4. Payment Security',
            body: 'All payment transactions are processed through PayTabs, a PCI-DSS compliant payment gateway. We do not store your credit card or banking details on our servers. All financial data is encrypted using SSL/TLS technology during transmission.',
          },
          {
            title: '5. Cookies',
            body: 'We use cookies to enhance your browsing experience, remember your cart contents, and analyse website traffic. You may disable cookies through your browser settings, though this may affect website functionality.',
          },
          {
            title: '6. Data Retention',
            body: 'We retain your personal data for as long as necessary to fulfil the purposes for which it was collected, including legal, accounting, or reporting requirements. Order records are retained for a minimum of 7 years in accordance with Omani commercial law.',
          },
          {
            title: '7. Your Rights',
            body: 'You have the right to access, correct, or delete your personal information. You may also object to or restrict processing of your data. To exercise these rights, please contact us at privacy@hayatsupplies.com.',
          },
          {
            title: '8. Contact',
            body: 'If you have any questions about this Privacy Policy, please contact our Data Protection team at privacy@hayatsupplies.com or by post to Hayat Supplies LLC, Al Khuwair, Muscat, Sultanate of Oman.',
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
