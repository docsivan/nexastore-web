// ─── Product ────────────────────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  nameAr: string
  sku: string
  category: ProductCategory
  subcategory?: string
  description: string
  descriptionAr: string
  price: number          // USD — already discounted final price
  priceVat: number       // price incl. 5% VAT
  list_price?: number
  discount_percent?: number
  currency: 'USD'
  images: string[]
  stock: number
  unit: string           // 'box', 'piece', 'pack', etc.
  unitSize?: string      // e.g. '100 pcs', '500ml'
  brand: string
  origin: string         // country of origin
  tags: string[]
  featured: boolean
  inStock: boolean
  minOrderQty: number
  packaging?: string
  certifications?: string[]
  relatedIds?: string[]
  breadcrumb?: string
  createdAt: string
}

// ─── Category ───────────────────────────────────────────────────────────────
export type ProductCategory = string

export interface Category {
  id: ProductCategory
  label: string
  labelAr: string
  icon: string
  description: string
  productCount: number
  color: string
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  vat: number
  total: number
  itemCount: number
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  items: CartItem[]
  customer: CustomerInfo
  shipping: ShippingInfo
  status: OrderStatus
  subtotal: number
  vat: number
  total: number
  paymentMethod: string
  paymentStatus: 'pending' | 'paid' | 'failed'
  createdAt: string
  estimatedDelivery?: string
  trackingNumber?: string
}

// ─── Customer / Checkout ─────────────────────────────────────────────────────
export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  company?: string
  vatNumber?: string
}

export interface ShippingInfo {
  address: string
  city: string
  governorate: string
  postalCode?: string
  country: 'Oman'
  notes?: string
}

export interface CheckoutFormData extends CustomerInfo, ShippingInfo {}

// ─── Search ──────────────────────────────────────────────────────────────────
export interface SearchResult {
  products: Product[]
  query: string
  total: number
}

export interface ProductFilters {
  category?: ProductCategory
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  brand?: string
  search?: string
}

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'featured'

// ─── Language ────────────────────────────────────────────────────────────────
export type Language = 'en' | 'ar'

// ─── Toast ───────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning'
export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}
