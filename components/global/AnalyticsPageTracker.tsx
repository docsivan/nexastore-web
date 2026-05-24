'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'

export default function AnalyticsPageTracker() {
  const pathname = usePathname()
  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])
  return null
}
