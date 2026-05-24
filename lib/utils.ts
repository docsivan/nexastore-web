import { Product, ProductFilters, SortOption } from './types'

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9).toUpperCase()
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((p) => {
    if (filters.category) {
      const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '-')
      if (norm(p.category) !== norm(filters.category)) return false
    }
    if (filters.minPrice !== undefined && p.price < filters.minPrice) return false
    if (filters.maxPrice !== undefined && p.price > filters.maxPrice) return false
    if (filters.inStock && !p.inStock) return false
    if (filters.brand && p.brand !== filters.brand) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
      if (!match) return false
    }
    return true
  })
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products]
  switch (sort) {
    case 'price-asc':  return copy.sort((a, b) => a.price - b.price)
    case 'price-desc': return copy.sort((a, b) => b.price - a.price)
    case 'name-asc':   return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'featured':   return copy.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    case 'newest':
    default:           return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export function getStockLabel(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600' }
  if (stock < 10) return { label: `Only ${stock} left`, color: 'text-orange-500' }
  if (stock < 30) return { label: 'Low Stock', color: 'text-yellow-600' }
  return { label: 'In Stock', color: 'text-accent-dark' }
}

export function getWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export const NEXA_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
export const NEXA_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'info@nexastore.io'
export const NEXA_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? ''

// Legacy aliases kept for compatibility
export const HAYAT_WHATSAPP = NEXA_WHATSAPP
export const HAYAT_EMAIL = NEXA_EMAIL
export const HAYAT_PHONE = NEXA_PHONE
