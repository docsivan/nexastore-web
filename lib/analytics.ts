declare global {
  interface Window {
    gtag: (command: string, ...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag(...args as [string, ...unknown[]])
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  gtag('event', name, params)
}

// TODO: call trackPurchase from payment callback when PayTabs is live
export function trackPurchase(order: { orderId: string; total: number; items: unknown[] }) {
  gtag('event', 'purchase', {
    transaction_id: order.orderId,
    value:          order.total,
    currency:       'OMR',
    items:          order.items,
  })
}

export function trackAddToCart(
  product: { id: string; name: string; price: number; category: string },
  quantity: number
) {
  gtag('event', 'add_to_cart', {
    currency: 'OMR',
    value:    Math.round(product.price * quantity * 1000) / 1000,
    items: [{
      item_id:       product.id,
      item_name:     product.name,
      item_category: product.category,
      price:         product.price,
      quantity,
    }],
  })
}

export function trackSearch(query: string, resultsCount: number) {
  gtag('event', 'search', { search_term: query, results_count: resultsCount })
}

export function trackPageView(url: string) {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (!id) return
  gtag('config', id, { page_path: url })
}
