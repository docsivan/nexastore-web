import type { Metadata } from 'next'
import TrustBar from '@/components/home/TrustBar'
import HeroBanners from '@/components/home/HeroBanners'
import FlashDeals from '@/components/home/FlashDeals'
import TopSellers from '@/components/home/TopSellers'
import NewArrivals from '@/components/home/NewArrivals'
import HighestDiscounts from '@/components/home/HighestDiscounts'
import FastMoving from '@/components/home/FastMoving'
import ComplianceStrip from '@/components/home/ComplianceStrip'
import NexaCTA from '@/components/home/NexaCTA'

export const metadata: Metadata = {
  title: 'NexaStore – AI Commerce Platform',
}

export default function HomePage() {
  return (
    <>
      {/* Section 1 — Trust Bar */}
      <TrustBar />

      {/* Section 2 — Hero Banners */}
      <HeroBanners />

      {/* Section 3 — Flash Deals */}
      <FlashDeals />

      {/* Section 4 — Top Sellers */}
      <TopSellers />

      {/* Section 5 — New Arrivals */}
      <NewArrivals />

      {/* Section 6 — Highest Discounts */}
      <HighestDiscounts />

      {/* Section 7 — Fast Moving / Scarcity */}
      <FastMoving />

      {/* Section 9 — Compliance Strip */}
      <ComplianceStrip />

      {/* Section 10 — Nexa Chat CTA */}
      <NexaCTA />
    </>
  )
}
