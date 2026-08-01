/**
 * lib/adapters.ts
 * Converts record-shaped rows into the Product type used by the cart,
 * ProductCard, and all existing UI components. Keeps the UI layer unchanged
 * while the data layer is Supabase.
 */

import { AirtableProduct, ProductFields } from './airtableTypes'
import { Product, ProductCategory } from './types'


function resolveImage(image_url: string, product_page_url: string, name: string): string {
  if (image_url) return image_url
  if (product_page_url && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(product_page_url)) {
    return product_page_url
  }
  return `https://placehold.co/600x600/003B73/FFFFFF?text=${encodeURIComponent(name.slice(0, 20))}`
}

/**
 * Converts an Airtable product record into the Product interface
 * consumed by all existing UI components and the cart system.
 */
export function adaptAirtableProduct(ap: AirtableProduct): Product {
  const f = ap as unknown as ProductFields & Record<string, unknown>
  // Airtable single-select fields can return { name: "value" } at runtime
  const rawCat = (typeof f.category === 'object' && f.category !== null
    ? (f.category as { name?: string }).name ?? String(f.category)
    : String(f.category ?? ''))
  const finalPrice = parseFloat(String(f.final_price ?? f.list_price ?? f['Price'] ?? f['price'] ?? f['unit_price'] ?? f['sale_price'] ?? 0)) || 0
  const vatPrice   = Math.round(finalPrice * 1.05 * 100) / 100

  return {
    id:           f.item_code,           // item_code is the routing key
    name:         f.name,
    nameAr:       f.name,                // Arabic name not in schema — falls back to EN
    sku:          f.sku,
    category:     rawCat,
    description:  `${f.brand} · ${f.pack_size}`,
    descriptionAr: `${f.brand} · ${f.pack_size}`,
    price:           finalPrice,
    list_price:      f.list_price != null ? Number(f.list_price) : undefined,
    discount_percent: f.discount_percent != null ? Number(f.discount_percent) : undefined,
    priceVat:        vatPrice,
    currency:     'USD',
    images:       [resolveImage(f.image_url ?? '', f.product_page_url, f.name)],
    stock:        Number(f.stock_quantity) || 0,
    unit:         f.pack_size || 'unit',
    unitSize:     f.pack_size,
    brand:        f.brand,
    origin:       '',
    tags:         [rawCat, f.brand, f.sku].filter(Boolean),
    featured:     false,
    inStock:      (f.stock_quantity ?? 0) > 0 && f.is_active,
    minOrderQty:  1,
    packaging:    f.pack_size,
    certifications: [],
    relatedIds:   [],
    breadcrumb:   f.breadcrumb,
    createdAt:    ap.createdTime ?? new Date().toISOString(),
  }
}

/**
 * Converts multiple Airtable products at once.
 */
export function adaptAirtableProducts(products: AirtableProduct[]): Product[] {
  return products.map(adaptAirtableProduct)
}
