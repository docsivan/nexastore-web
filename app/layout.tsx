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
  url:        'https://nexastore.io',
  potentialAction: {
    '@type':      'SearchAction',
    target:       'https://nexastore.io/products?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'NexaStore',
  description: 'Universal AI commerce platform. Commerce powered by intelligence.',
  url:        'https://nexastore.io',
}

export const metadata: Metadata = {
  title: {
    default: 'NexaStore – AI Commerce Platform',
    template: '%s | NexaStore',
  },
  description:
    'NexaStore is a universal AI commerce platform. Commerce powered by intelligence — fast global delivery, AI-driven search, and smart procurement.',
  keywords: ['AI commerce', 'ecommerce platform', 'AI shopping', 'smart procurement', 'NexaStore'],
  openGraph: {
    title: 'NexaStore – AI Commerce Platform',
    description: 'Commerce. Powered by Intelligence.',
    url: 'https://nexastore.io',
    siteName: 'NexaStore',
    locale: 'en_US',
    type: 'website',
  },
  robots: { index: true, follow: true },
  themeColor: '#0D0D0D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${outfit.variable}`}>
      <body>
        <Script id="website-schema" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(webSiteSchema)}
        </Script>
        <Script id="organization-schema" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(organizationSchema)}
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
