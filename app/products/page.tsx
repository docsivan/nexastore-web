import type { Metadata } from 'next'
import { getProducts } from '@/lib/airtable'
import { adaptAirtableProducts } from '@/lib/adapters'
import { ProductCategory } from '@/lib/types'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import ProductGrid from '@/components/products/ProductGrid'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { generateItemListSchema } from '@/lib/schema'

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'nexastore.io'

export const metadata: Metadata = { title: 'Products' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function ProductListingPage({ searchParams }: Props) {
  try {
    const params = await searchParams
    const airtableProducts = await getProducts()
    const products = adaptAirtableProducts(airtableProducts)

    const itemListJson = generateItemListSchema(
      products.slice(0, 20).map((p, i) => ({
        name:     p.name,
        url:      `https://${SITE_DOMAIN}/products/${p.id}`,
        position: i + 1,
      }))
    )

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJson }} />
        <div className="container-page pt-4">
          <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />
        </div>
        <ProductGrid
          products={products}
          initialCategory={(params.category as ProductCategory) ?? ''}
          initialSearch={params.q ?? ''}
        />
      </>
    )
  } catch (error) {
    console.error('[PLP] Failed to load products:', error)
    return (
      <div className="container-page py-14">
        <ErrorMessage message="We could not load products at the moment. Please try again shortly." />
      </div>
    )
  }
}
