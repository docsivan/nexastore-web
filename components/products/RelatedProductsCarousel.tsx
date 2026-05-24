import { getProductById } from '@/lib/mockData'
import ProductCard from './ProductCard'

interface Props {
  relatedIds?: string[]
  currentId: string
}

export default function RelatedProductsCarousel({ relatedIds, currentId }: Props) {
  if (!relatedIds || relatedIds.length === 0) return null

  const related = relatedIds
    .filter((id) => id !== currentId)
    .map(getProductById)
    .filter(Boolean) as NonNullable<ReturnType<typeof getProductById>>[]

  if (related.length === 0) return null

  return (
    <section className="mt-14">
      <h2 className="font-heading font-bold text-xl text-primary-dark mb-6">Related Products</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
