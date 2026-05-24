import Link from 'next/link'

interface Props {
  heading?: string
  subtext?: string
  ctaLabel?: string
  ctaHref?: string
  onAction?: () => void
  // Legacy props kept for backward compat
  icon?: string
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  heading,
  subtext,
  ctaLabel,
  ctaHref,
  onAction,
  // Legacy
  title,
  description,
  actionLabel,
  actionHref,
}: Props) {
  const resolvedHeading = heading ?? title ?? 'Nothing here yet'
  const resolvedSubtext = subtext ?? description ?? 'Check back soon — we update our catalogue every day.'
  const resolvedCtaLabel = ctaLabel ?? actionLabel ?? 'Browse All Products'
  const resolvedCtaHref = ctaHref ?? actionHref ?? '/products'

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <svg viewBox="0 0 120 100" fill="none" className="w-32 h-28 mb-6" aria-hidden="true">
        <rect x="20" y="30" width="80" height="55" rx="6" fill="#E6EFF8" />
        <rect x="30" y="42" width="60" height="6" rx="3" fill="#CCDFF1" />
        <rect x="30" y="54" width="44" height="6" rx="3" fill="#CCDFF1" />
        <rect x="30" y="66" width="28" height="6" rx="3" fill="#CCDFF1" />
        <circle cx="60" cy="18" r="10" fill="#0D0D0D" opacity="0.15" />
        <path d="M55 18h10M60 13v10" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h3 className="text-lg font-bold text-[#0D0D0D] font-heading mb-2">{resolvedHeading}</h3>
      <p className="text-sm text-gray-500 font-body max-w-xs mb-6">{resolvedSubtext}</p>
      {resolvedCtaHref ? (
        <Link
          href={resolvedCtaHref}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0D0D0D] hover:bg-[#002855] text-white text-sm font-semibold font-heading rounded-lg transition-colors"
        >
          {resolvedCtaLabel}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      ) : onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0D0D0D] hover:bg-[#002855] text-white text-sm font-semibold font-heading rounded-lg transition-colors"
        >
          {resolvedCtaLabel}
        </button>
      ) : null}
    </div>
  )
}
