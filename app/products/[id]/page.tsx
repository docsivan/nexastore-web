import { notFound }   from 'next/navigation'
import { headers }    from 'next/headers'
import type { Metadata } from 'next'
import { getProductByItemCode, getProducts } from '@/lib/airtable'
import { adaptAirtableProduct, adaptAirtableProducts } from '@/lib/adapters'
import { generateProductSchema, generateMedicalDeviceSchema, generateBreadcrumb } from '@/lib/schema'
import Breadcrumbs from '@/components/global/Breadcrumbs'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ProductInfoPanel from '@/components/products/ProductInfoPanel'
import RelatedProductsCarousel from '@/components/products/RelatedProductsCarousel'
import RecentlyViewed from '@/components/products/RecentlyViewed'
import NexaRecommend from '@/components/products/NexaRecommend'
import ProductViewTracker from '@/components/products/ProductViewTracker'
import SignalCapture from '@/components/products/SignalCapture'
import ReviewsSection from '@/components/products/ReviewsSection'
import ErrorMessage from '@/components/ui/ErrorMessage'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }   // id = item_code  e.g. "IC-001"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const record = await getProductByItemCode(params.id)
    if (!record) return { title: 'Product Not Found' }

    const acceptLang = (await headers()).get('accept-language') ?? ''
    const isArabic   = acceptLang.toLowerCase().includes('ar')

    if (isArabic) {
      const API_KEY = process.env.AIRTABLE_API_KEY
      const BASE_ID = process.env.AIRTABLE_BASE_ID
      if (API_KEY && BASE_ID) {
        try {
          const formula = encodeURIComponent(`AND({item_code}="${params.id}",NOT({meta_title_ar}=""))`)
          const seoRes  = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Nexa_SEO?filterByFormula=${formula}&maxRecords=1`,
            { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
          )
          if (seoRes.ok) {
            const seoData = await seoRes.json()
            const f       = seoData.records?.[0]?.fields
            if (f?.meta_title_ar) {
              return {
                title:       String(f.meta_title_ar),
                description: f.meta_description_ar ? String(f.meta_description_ar) : undefined,
              }
            }
          }
        } catch {}
      }
    }

    return {
      title:       `${record.fields.name} | NexaStore`,
      description: `${record.fields.brand} · ${record.fields.pack_size} · OMR ${record.fields.final_price.toFixed(3)}`,
    }
  } catch {
    return { title: 'Product' }
  }
}

export default async function ProductDetailPage({ params }: Props) {
  try {
    const record = await getProductByItemCode(params.id)
    if (!record || !record.fields.is_active) notFound()

    const product = adaptAirtableProduct(record)
    const categoryLabel = product.category
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    // Fetch same-category products for the related section
    const allRecords = await getProducts()
    const related = adaptAirtableProducts(allRecords)
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4)
      .map((p) => p.id)

    // Airtable credentials (used for SEO + reviews lookups)
    const API_KEY = process.env.AIRTABLE_API_KEY
    const BASE_ID = process.env.AIRTABLE_BASE_ID

    // Fetch reviews for aggregateRating
    let reviewCount    = 0
    let averageRating  = 0
    if (API_KEY && BASE_ID) {
      try {
        const formula  = encodeURIComponent(`AND({item_code}="${product.id}",{published}=TRUE())`)
        const revRes   = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/Haya_Reviews?filterByFormula=${formula}&maxRecords=50`,
          { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
        )
        if (revRes.ok) {
          const revData = await revRes.json()
          const revs    = revData.records ?? []
          reviewCount   = revs.length
          if (reviewCount > 0) {
            averageRating = revs.reduce((sum: number, r: { fields: { rating?: number } }) => sum + (r.fields.rating ?? 0), 0) / reviewCount
            averageRating = Math.round(averageRating * 10) / 10
          }
        }
      } catch {}
    }

    // Check Nexa_SEO for pre-generated schema
    let schemaJson: string | null = null
    if (API_KEY && BASE_ID) {
      try {
        const formula  = encodeURIComponent(`{item_code}="${product.id}"`)
        const seoRes   = await fetch(
          `https://api.airtable.com/v0/${BASE_ID}/Nexa_SEO?filterByFormula=${formula}&maxRecords=1`,
          { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
        )
        const seoData  = await seoRes.json()
        const hayaSchema = seoData.records?.[0]?.fields?.schema_json as string | undefined
        if (hayaSchema && hayaSchema.trim().startsWith('{')) schemaJson = hayaSchema
      } catch {}
    }

    // Fall back to generated schema — MedicalDevice for clinical categories, Product otherwise
    const MEDICAL_DEVICE_CATEGORIES = ['medical-devices', 'sterilization', 'diagnostics']
    if (!schemaJson) {
      schemaJson = MEDICAL_DEVICE_CATEGORIES.includes(product.category)
        ? generateMedicalDeviceSchema(product)
        : generateProductSchema(product)
    }

    // Inject aggregateRating into schema if reviews exist
    if (reviewCount > 0) {
      try {
        const parsed = JSON.parse(schemaJson)
        parsed.aggregateRating = {
          '@type':       'AggregateRating',
          ratingValue:   averageRating.toFixed(1),
          reviewCount:   reviewCount,
          bestRating:    '5',
          worstRating:   '1',
        }
        schemaJson = JSON.stringify(parsed)
      } catch {}
    }

    const breadcrumbJson = generateBreadcrumb([
      { name: 'Home',     url: '/' },
      { name: 'Products', url: '/products' },
      { name: categoryLabel, url: `/products?category=${product.category}` },
      { name: product.name, url: `/products/${product.id}` },
    ])

    return (
      <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJson }} />
      <div className="container-page py-6 pb-14">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: categoryLabel, href: `/products?category=${product.category}` },
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-4">
          <ProductImageGallery images={product.images} name={product.name} />
          <ProductInfoPanel product={product} />
        </div>

        <div className="mt-6">
          <NexaRecommend productName={product.name} itemCode={product.id} category={product.category} />
        </div>

        <div className="mt-4">
          <ReviewsSection itemCode={product.id} />
        </div>

        <RelatedProductsCarousel relatedIds={related} currentId={product.id} />
        <RecentlyViewed />
        <ProductViewTracker
          item_code={product.id}
          name={product.name}
          final_price={product.price}
          category={product.category}
          brand={product.brand}
        />
        <SignalCapture itemCode={product.id} pageUrl={`/products/${product.id}`} />
      </div>
      </>
    )
  } catch (error: unknown) {
    // Re-throw Next.js notFound() and redirect() errors — must not be caught
    if (
      error instanceof Error &&
      (error.message === 'NEXT_NOT_FOUND' ||
       error.message.includes('NEXT_') ||
       (error as { digest?: string }).digest?.startsWith('NEXT_'))
    ) throw error
    console.error('[PDP] Failed to load product:', error)
    return (
      <div className="container-page py-14">
        <ErrorMessage message="We could not load this product. Please try again shortly." />
      </div>
    )
  }
}
