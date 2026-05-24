export function formatPrice(amount: number, showCurrency = true): string {
  const formatted = amount.toLocaleString('en-OM', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
  return showCurrency ? `OMR ${formatted}` : formatted
}

export function formatPriceAr(amount: number): string {
  return `${amount.toLocaleString('ar-OM', { minimumFractionDigits: 3 })} ر.ع.`
}

export function formatDate(dateStr: string, locale: 'en' | 'ar' = 'en'): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatOrderId(id: string): string {
  return `#HS-${id.padStart(6, '0')}`
}

export function calculateVat(price: number, rate = 0.05): number {
  return Math.round(price * rate * 1000) / 1000
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
