import Link from 'next/link'

interface Crumb { label: string; href?: string }

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-body text-slate-muted py-3 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-muted/40 flex-shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
          {crumb.href && i < crumbs.length - 1 ? (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-slate font-medium' : ''}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
