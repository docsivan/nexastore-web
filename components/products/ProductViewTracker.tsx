'use client'

import { useEffect } from 'react'
import { trackProductView } from '@/components/products/RecentlyViewed'

interface Props {
  item_code: string
  name: string
  final_price: number
  category: string
  brand: string
}

export default function ProductViewTracker({ item_code, name, final_price, category, brand }: Props) {
  useEffect(() => {
    trackProductView({ item_code, name, final_price, category, brand })
  }, [item_code, name, final_price, category, brand])

  return null
}
