import Link from 'next/link'
import { getFeaturedProducts } from '@/lib/mockData'
import ProductCard from '@/components/products/ProductCard'

export default function FeaturedProductsCarousel() {
  const products = getFeaturedProducts()

  return (
    <section className="bg-white border-y border-border py-14">
      <div className="container-page">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-body text-xs text-accent-dark font-semibold tracking-widest uppercase mb-1">Top Picks</p>
            <h2 className="font-heading font-bold text-2xl lg:text-3xl text-primary-dark">Featured Products</h2>
          </div>
          <Link href="/products?featured=true" className="text-sm font-body font-medium text-primary hover:text-primary-light transition-colors hidden sm:block">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((product, i) => (
            <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
