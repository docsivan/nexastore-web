import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
const borders = { sm: 'border-2', md: 'border-2', lg: 'border-3' }

export default function LoaderSpinner({ size = 'md', className }: Props) {
  return (
    <div
      className={cn(
        sizes[size],
        borders[size],
        'rounded-full border-primary-50 border-t-primary animate-spin',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <LoaderSpinner size="lg" />
        <p className="text-sm text-slate-light font-body">Loading…</p>
      </div>
    </div>
  )
}
