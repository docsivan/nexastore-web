import { Product } from './types'

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'nexastore.io'

function baseOffers(product: Product) {
  return {
    '@type':       'Offer',
    price:         product.price.toFixed(3),
    priceCurrency: 'OMR',
    availability:  product.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url:    `https://${SITE_DOMAIN}/products/${product.id}`,
    seller: { '@type': 'Organization', name: 'NexaStore' },
  }
}

export function generateProductSchema(product: Product): string {
  const schema = {
    '@context':  'https://schema.org',
    '@type':     'Product',
    name:        product.name,
    description: product.description || `${product.brand} ${product.name}${product.unitSize ? ` — ${product.unitSize}` : ''}`,
    sku:         product.id,
    brand:       { '@type': 'Brand', name: product.brand || 'NexaStore' },
    category:    product.category.replace(/-/g, ' '),
    image:       product.images?.[0] ?? undefined,
    offers:      baseOffers(product),
  }
  return JSON.stringify(schema)
}

export function generateMedicalDeviceSchema(product: Product): string {
  const schema = {
    '@context':  'https://schema.org',
    '@type':     'MedicalDevice',
    name:        product.name,
    description: product.description || `${product.brand} ${product.name}${product.unitSize ? ` — ${product.unitSize}` : ''}`,
    identifier:  product.id,
    brand:       { '@type': 'Brand', name: product.brand || 'NexaStore' },
    manufacturer: { '@type': 'Organization', name: product.brand || 'NexaStore' },
    image:       product.images?.[0] ?? undefined,
    offers:      baseOffers(product),
  }
  return JSON.stringify(schema)
}

export function generateHowToSchema(title: string, steps: { name: string; text: string }[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type':    'HowTo',
    name:       title,
    step:       steps.map((s, i) => ({
      '@type':   'HowToStep',
      position:  i + 1,
      name:      s.name,
      text:      s.text,
    })),
  }
  return JSON.stringify(schema)
}

export function generateItemListSchema(items: { name: string; url: string; position: number }[]): string {
  const schema = {
    '@context':      'https://schema.org',
    '@type':         'ItemList',
    itemListElement: items.map(item => ({
      '@type':   'ListItem',
      position:  item.position,
      name:      item.name,
      url:       item.url.startsWith('http') ? item.url : `https://${SITE_DOMAIN}${item.url}`,
    })),
  }
  return JSON.stringify(schema)
}

export function generateLocalBusinessSchema(page: { title: string; category: string; slug: string }): string {
  const schema = {
    '@context':  'https://schema.org',
    '@type':     'LocalBusiness',
    name:        'NexaStore',
    description: page.title,
    url:         `https://${SITE_DOMAIN}/oman/${page.slug}`,
    telephone:   '+968-XXXXXXXX',
    priceRange:  'OMR',
    currenciesAccepted: 'OMR',
    address: {
      '@type':           'PostalAddress',
      addressCountry:    'OM',
      addressLocality:   'Muscat',
      addressRegion:     'Muscat Governorate',
    },
    areaServed: {
      '@type': 'Country',
      name:    'Oman',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name:    page.category.replace(/-/g, ' '),
      url:     `https://${SITE_DOMAIN}/products?category=${page.category}`,
    },
  }
  return JSON.stringify(schema)
}

export function generateBreadcrumb(items: { name: string; url: string }[]): string {
  const schema = {
    '@context':       'https://schema.org',
    '@type':          'BreadcrumbList',
    itemListElement:  items.map((item, index) => ({
      '@type':   'ListItem',
      position:  index + 1,
      name:      item.name,
      item:      item.url.startsWith('http') ? item.url : `https://${SITE_DOMAIN}${item.url}`,
    })),
  }
  return JSON.stringify(schema)
}
