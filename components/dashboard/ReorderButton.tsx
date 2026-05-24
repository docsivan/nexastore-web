'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartContext } from '@/context/CartContext'
import { useToast } from '@/components/ui/ToastNotification'
import { OrderItem } from '@/components/dashboard/OrderHistory'

interface Props {
  items: OrderItem[]
}

export default function ReorderButton({ items }: Props) {
  const { addItem } = useCartContext()
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReorder = async () => {
    setLoading(true)
    let unavailable = 0

    for (const item of items) {
      try {
        const res = await fetch(`/api/products/${item.item_code}`)
        if (!res.ok) { unavailable++; continue }
        const product = await res.json()
        if (!product?.inStock) { unavailable++; continue }
        addItem(product, item.quantity)
      } catch {
        unavailable++
      }
    }

    setLoading(false)
    if (unavailable > 0) showToast(`${unavailable} item${unavailable > 1 ? 's' : ''} unavailable — added rest to cart`, 'warning')
    else showToast('All items added to cart', 'success')
    router.push('/cart')
  }

  return (
    <button
      onClick={handleReorder}
      disabled={loading}
      className="text-sm font-body font-medium border border-primary text-primary px-4 py-1.5 rounded-btn hover:bg-primary hover:text-white transition-colors disabled:opacity-40"
    >
      {loading ? 'Adding…' : '↻ Reorder'}
    </button>
  )
}
