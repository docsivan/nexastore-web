'use client'

interface Props {
  productName: string
  itemCode: string
  category: string
}

export default function NexaRecommend({ productName, itemCode, category }: Props) {
  const openHaya = () => {
    const preloadMessage = `I'm looking at ${productName} (SKU: ${itemCode}). Can you tell me more about it and suggest related products for ${category}?`
    window.dispatchEvent(
      new CustomEvent('haya:open', { detail: { preloadMessage } })
    )
  }

  return (
    <button
      onClick={openHaya}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn border border-primary/30 text-primary text-sm font-heading font-semibold hover:bg-primary hover:text-white transition-all"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Ask Haya about this product
    </button>
  )
}
