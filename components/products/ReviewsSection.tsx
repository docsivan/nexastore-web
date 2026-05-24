'use client'

import { useState, useEffect } from 'react'

interface Review {
  id:                string
  rating:            number
  review_text:       string
  verified_purchase: boolean
  created_at:        string
}

interface ReviewsData {
  reviews:       Review[]
  averageRating: number
  count:         number
}

interface Props {
  itemCode: string
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={`${sizeClass} ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewsSection({ itemCode }: Props) {
  const [data,    setData]    = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reviews/${encodeURIComponent(itemCode)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData({ reviews: [], averageRating: 0, count: 0 }))
      .finally(() => setLoading(false))
  }, [itemCode])

  if (loading) {
    return (
      <div className="mt-8 space-y-3">
        <div className="h-6 bg-gray-100 rounded animate-pulse w-40" />
        <div className="h-20 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (!data || data.count === 0) {
    return (
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="font-heading font-semibold text-base text-primary-dark mb-2">Customer Reviews</h3>
        <p className="font-body text-sm text-slate-muted">No reviews yet. Be the first to review this product.</p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center gap-4 mb-5">
        <h3 className="font-heading font-semibold text-base text-primary-dark">Customer Reviews</h3>
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(data.averageRating)} size="md" />
          <span className="font-heading font-bold text-lg text-primary-dark">{data.averageRating.toFixed(1)}</span>
          <span className="font-body text-sm text-slate-muted">({data.count} review{data.count !== 1 ? 's' : ''})</span>
        </div>
      </div>

      <div className="space-y-4">
        {data.reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} />
                {review.verified_purchase && (
                  <span className="text-[10px] font-body font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                    Verified Purchase
                  </span>
                )}
              </div>
              {review.created_at && (
                <span className="text-xs font-body text-slate-muted whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <p className="font-body text-sm text-slate leading-relaxed">{review.review_text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
