import TrustBar from '@/components/home/TrustBar'
import HeroBanners from '@/components/home/HeroBanners'
import FlashDeals from '@/components/home/FlashDeals'
import TopSellers from '@/components/home/TopSellers'
import NewArrivals from '@/components/home/NewArrivals'
import HighestDiscounts from '@/components/home/HighestDiscounts'
import FastMoving from '@/components/home/FastMoving'
import ComplianceStrip from '@/components/home/ComplianceStrip'
import NexaCTA from '@/components/home/NexaCTA'

// Title intentionally omitted — the root layout's `title.default` already reads
// "<PLATFORM_NAME> – AI Commerce Platform". A string title here would be run
// through the layout's `%s | <PLATFORM_NAME>` template and duplicate the brand.

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
