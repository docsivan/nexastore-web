import type { Metadata } from 'next'
import Script from 'next/script'
import { Outfit } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { ToastProvider } from '@/components/ui/ToastNotification'
import LayoutWrapper from '@/components/global/LayoutWrapper'
import { ChatProvider } from '@/context/ChatContext'
import { AuthProvider } from '@/context/AuthContext'
import ChatWidget from '@/components/global/ChatWidget'
import WhatsAppFloat from '@/components/ui/WhatsAppFloat'
import AnalyticsPageTracker from '@/components/global/AnalyticsPageTracker'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-heading',
})


const GA_ID       = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const CLARITY_ID  = process.env.NEXT_PUBLIC_CLARITY_ID

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  url:        'https://hayatsupplies.com',
  potentialAction: {
    '@type':      'SearchAction',
    target:       'https://hayatsupplies.com/products?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const medicalBusinessSchema = {
  '@context':    'https://schema.org',
  '@type':       'MedicalBusiness',
  name:          'Hayat Supplies',
  description:   'Professional healthcare and medical supplies for clinics, hospitals, and dental practices in the Sultanate of Oman.',
  url:           'https://hayatsupplies.com',
  telephone:     '+968-XXXXXXXX',
  priceRange:    'OMR',
  currenciesAccepted: 'OMR',
  address: {
    '@type':           'PostalAddress',
    addressCountry:    'OM',
    addressLocality:   'Muscat',
    addressRegion:     'Muscat Governorate',
  },
  areaServed: {
    '@type': 'Country',
    name:    'Oman',
  },
  medicalSpecialty: [
    'Dentistry',
    'InfectionControl',
    'Diagnostics',
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Hayat Supplies – Professional Healthcare & Medical Supplies in Oman',
    template: '%s | Hayat Supplies',
  },
  description:
    'Hayat Supplies is your trusted procurement partner for infection control, dental supplies, PPE, diagnostics and sterilization equipment in the Sultanate of Oman.',
  keywords: ['medical supplies Oman', 'dental supplies Oman', 'infection control Oman', 'PPE Oman', 'healthcare procurement Muscat'],
  openGraph: {
    title: 'Hayat Supplies – Professional Healthcare Supplies in Oman',
    description: 'Infection control, dental, PPE, diagnostics and sterilization equipment. ISO 13485 certified. MOH compliant.',
    url: 'https://hayatsupplies.com',
    siteName: 'Hayat Supplies',
    locale: 'en_OM',
    type: 'website',
  },
  robots: { index: true, follow: true },
  themeColor: '#003B73',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${outfit.variable}`}>
      <body>
        <Script id="website-schema" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(webSiteSchema)}
        </Script>
        <Script id="medical-business-schema" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(medicalBusinessSchema)}
        </Script>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
        {CLARITY_ID && (
          <Script id="clarity-init" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`}
          </Script>
        )}
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <ChatProvider>
                  <LayoutWrapper>{children}</LayoutWrapper>
                  <ChatWidget />
                  <WhatsAppFloat />
                  <AnalyticsPageTracker />
                </ChatProvider>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
