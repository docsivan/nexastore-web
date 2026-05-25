/**
 * lib/adapters.ts
 * Converts Airtable field-named records into the Product type
 * used by the cart, ProductCard, and all existing UI components.
 * This keeps the UI layer unchanged while the data layer is Airtable.
 */

import { AirtableProduct, ProductFields } from './airtableTypes'
import { Product, ProductCategory } from './types'

const CATEGORY_MAP: Record<string, ProductCategory> = {
  'moisturisers':  'moisturisers',
  'moisturiser':   'moisturisers',
  'moisturizer':   'moisturisers',
  'moisturizers':  'moisturisers',
  'serums':        'serums',
  'serum':         'serums',
  'cleansers':     'cleansers',
  'cleanser':      'cleansers',
  'sunscreen':     'sunscreen',
  'sun-screen':    'sunscreen',
  'spf':           'sunscreen',
  'treatments':    'treatments',
  'treatment':     'treatments',
  // Legacy healthcare → cosmetics fallbacks
  'infection-control':             'moisturisers',
  'infection control':             'moisturisers',
  'dental-supplies':               'serums',
  'dental supplies':               'serums',
  'dental':                        'serums',
  'medical-devices':               'cleansers',
  'medical devices':               'cleansers',
  'medical':                       'cleansers',
  'ppe':                           'sunscreen',
  'personal protective equipment': 'sunscreen',
  'diagnostics':                   'treatments',
  'diagnostic':                    'treatments',
  'sterilization':                 'treatments',
  'sterilisation':                 'treatments',
}

function normaliseCategory(raw: string): ProductCategory {
  if (!raw) return 'cleansers'
  const key = raw.toLowerCase().trim()
  return CATEGORY_MAP[key] ?? 'cleansers'
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
  const f = ap.fields as ProductFields & Record<string, unknown>
  const finalPrice = parseFloat(String(f.final_price ?? f.list_price ?? f['Price'] ?? f['price'] ?? f['unit_price'] ?? f['sale_price'] ?? 0)) || 0
  const vatPrice   = Math.round(finalPrice * 1.05 * 100) / 100

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
    currency:     'USD',
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
