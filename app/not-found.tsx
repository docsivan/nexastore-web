import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <span className="text-3xl font-heading font-bold text-primary">404</span>
      </div>
      <h1 className="font-heading font-bold text-2xl text-primary-dark mb-2">
        Page not found
      </h1>
      <p className="font-body text-slate-muted mb-8 max-w-sm">
        This product may have been discontinued or the link may be incorrect.
      </p>
      <Link
        href="/products"
        className="btn-primary px-6 py-2.5 font-heading font-semibold text-sm"
      >
        Browse all products
      </Link>
    </div>
  )
}
