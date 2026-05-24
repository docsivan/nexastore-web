import Link from 'next/link'

interface Props {
  title: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
}

export default function SectionHeader({ title, subtitle, viewAllHref, viewAllLabel = 'View All' }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex gap-3 items-start">
        <div className="w-1 self-stretch rounded-full bg-[#0D0D0D] flex-shrink-0 min-h-[2rem]" />
        <div>
          <h2 className="text-2xl font-bold text-[#0D0D0D] font-heading leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 font-body mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-sm font-semibold text-[#0D0D0D] hover:text-[#002855] font-body whitespace-nowrap mt-1 flex items-center gap-1 flex-shrink-0"
        >
          {viewAllLabel}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}
