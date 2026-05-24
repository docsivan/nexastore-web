export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
      {/* Image area */}
      <div
        className="h-[240px] flex-shrink-0 animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
        }}
      />
      {/* Content */}
      <div className="px-4 pt-3 pb-0 flex-1 flex flex-col gap-2">
        <div className="h-3 w-16 rounded animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
        <div className="h-4 w-full rounded animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
        <div className="h-4 w-3/4 rounded animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
        <div className="h-3 w-20 rounded mt-1 animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
        <div className="h-5 w-24 rounded mt-1 animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
      </div>
      {/* Button */}
      <div className="mt-3 h-[44px] animate-shimmer" style={{ background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%' }} />
    </div>
  )
}
