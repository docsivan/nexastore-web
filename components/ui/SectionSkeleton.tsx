import ProductCardSkeleton from './ProductCardSkeleton'

interface Props {
  count?: number
}

export default function SectionSkeleton({ count = 4 }: Props) {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3 items-center">
          <div className="w-1 h-8 rounded-full bg-gray-200" />
          <div>
            <div className="h-6 w-40 rounded bg-gray-200 animate-shimmer" style={{ backgroundSize: '200% 100%', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)' }} />
            <div className="h-3 w-56 rounded bg-gray-200 animate-shimmer mt-1.5" style={{ backgroundSize: '200% 100%', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)' }} />
          </div>
        </div>
        <div className="h-4 w-16 rounded bg-gray-200 animate-shimmer" style={{ backgroundSize: '200% 100%', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)' }} />
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
