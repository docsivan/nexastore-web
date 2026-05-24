/**
 * lib/adapters.ts
 * Converts Airtable field-named records into the Product type
 * used by the cart, ProductCard, and all existing UI components.
 * This keeps the UI layer unchanged while the data layer is Airtable.
 */

import { AirtableProduct } from './airtableTypes'
import { Product, ProductCategory } from './types'

const CATEGORY_MAP: Record<string, ProductCategory> = {
  'infection-control':             'infection-control',
  'infection control':             'infection-control',
  'infectioncontrol':              'infection-control',
  'dental-supplies':               'dental-supplies',
  'dental supplies':               'dental-supplies',
  'dental':                        'dental-supplies',
  'dentalequipment':               'dental-supplies',
  'dental equipment':              'dental-supplies',
  'medical-devices':               'medical-devices',
  'medical devices':               'medical-devices',
  'medical':                       'medical-devices',
  'medicaldevices':                'medical-devices',
  'ppe':                           'ppe',
  'personal protective equipment': 'ppe',
  'personal-protective-equipment': 'ppe',
  'diagnostics':                   'diagnostics',
  'diagnostic':                    'diagnostics',
  'sterilization':                 'sterilization',
  'sterilisation':                 'sterilization',
  'sterile':                       'sterilization',
}

function normaliseCategory(raw: string): ProductCategory {
  if (!raw) return 'medical-devices'
  const key = raw.toLowerCase().trim()
  return CATEGORY_MAP[key] ?? (key.replace(/\s+/g, '-') as ProductCategory)
}

function resolveImage(image_url: string, product_page_url: string, name: string, item_code = ''): string {
  if (image_url) {
    if (image_url.startsWith('https://erp.hospitalshop.com')) {
      return `/api/img?url=${encodeURIComponent(image_url)}&code=${encodeURIComponent(item_code)}`
    }
    return image_url
  }
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
  const f = ap.fields
  const finalPrice = Number(f.final_price) || 0
  const vatPrice   = Math.round(finalPrice * 1.05 * 1000) / 1000

  return {
    id:           f.item_code,           // item_code is the routing key
    name:         f.name,
    nameAr:       f.name,                // Arabic name not in schema — falls back to EN
    sku:          f.sku,
    category:     normaliseCategory(f.category),
    description:  `${f.brand} · ${f.pack_size}`,
    descriptionAr: `${f.brand} · ${f.pack_size}`,
    price:           finalPrice,
    list_price:      f.list_price != null ? Number(f.list_price) : undefined,
    discount_percent: f.discount_percent != null ? Number(f.discount_percent) : undefined,
    priceVat:        vatPrice,
    currency:     'OMR',
    images:       [resolveImage(f.image_url ?? '', f.product_page_url, f.name, f.item_code)],
    stock:        Number(f.stock_quantity) || 0,
    unit:         f.pack_size || 'unit',
    unitSize:     f.pack_size,
    brand:        f.brand,
    origin:       '',
    tags:         [f.category, f.brand, f.sku].filter(Boolean),
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
