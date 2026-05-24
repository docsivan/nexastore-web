interface ProductBadgeProps {
  discount_percent?: number
  is_new?: boolean
  is_best_seller?: boolean
  stock_quantity?: number
  is_fast_delivery?: boolean
}

export default function ProductBadges({
  discount_percent = 0,
  is_new = false,
  is_best_seller = false,
  stock_quantity,
  is_fast_delivery = false,
}: ProductBadgeProps) {
  const badges: React.ReactElement[] = []

  if (discount_percent > 0) {
    badges.push(
      <span
        key="sale"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-body text-white"
        style={{ background: '#D32F2F' }}
      >
        {discount_percent}% OFF
      </span>
    )
  }

  if (is_best_seller && badges.length < 2) {
    badges.push(
      <span
        key="bestseller"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-body text-white"
        style={{ background: '#E65100' }}
      >
        BEST SELLER
      </span>
    )
  }

  if (is_new && badges.length < 2) {
    badges.push(
      <span
        key="new"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-body text-white"
        style={{ background: '#1565C0' }}
      >
        NEW
      </span>
    )
  }

  if (stock_quantity !== undefined && stock_quantity > 0 && stock_quantity < 10 && badges.length < 2) {
    badges.push(
      <span
        key="lowstock"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-body text-white"
        style={{ background: '#F57F17' }}
      >
        LOW STOCK
      </span>
    )
  }

  if (is_fast_delivery && badges.length < 2) {
    badges.push(
      <span
        key="fast"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-body text-white"
        style={{ background: '#F5A623' }}
      >
        FAST DELIVERY
      </span>
    )
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {badges.slice(0, 2)}
    </div>
  )
}
