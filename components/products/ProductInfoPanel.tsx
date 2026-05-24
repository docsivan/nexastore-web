'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/formatters'
import { getStockLabel } from '@/lib/utils'
import QuantitySelector from './QuantitySelector'
import AddToCartButton from './AddToCartButton'
import SmartWhatsAppButton from '@/components/order/SmartWhatsAppButton'
import TieredPricingBar from './TieredPricingBar'
import ScarcityBadge from './ScarcityBadge'

interface Props {
  product: Product
}

export default function ProductInfoPanel({ product }: Props) {
  const [quantity, setQuantity] = useState(product.minOrderQty)
  const stockInfo = getStockLabel(product.stock)

  const needsAi = !product.description || product.description.length < 50
  const [aiDesc, setAiDesc]       = useState('')
  const [isAiDesc, setIsAiDesc]   = useState(false)
  const [loadingAi, setLoadingAi] = useState(needsAi)

  useEffect(() => {
    if (!needsAi) return
    const params = new URLSearchParams({
      name:      product.name,
      brand:     product.brand,
      category:  product.category,
      pack_size: product.unitSize ?? '',
      existing:  product.description ?? '',
    })
    fetch(`/api/products/ai-description?${params}`)
      .then(r => r.json())
      .then(d => { setAiDesc(d.description ?? ''); setIsAiDesc(d.ai ?? false) })
      .catch(() => {})
      .finally(() => setLoadingAi(false))
  }, [product.id])

  const specs = [
    { label: 'SKU', value: product.sku },
    { label: 'Brand', value: product.brand },
    { label: 'Country of Origin', value: product.origin },
    ...(product.unitSize ? [{ label: 'Unit Size', value: product.unitSize }] : []),
    ...(product.packaging ? [{ label: 'Packaging', value: product.packaging }] : []),
    { label: 'Min. Order Qty', value: `${product.minOrderQty} ${product.unit}` },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Brand + Category */}
      <div className="flex items-center gap-2">
        <span className="font-body text-xs font-semibold text-accent-dark uppercase tracking-wider">{product.brand}</span>
        <span className="text-slate-muted/50">·</span>
        <span className="font-body text-xs text-slate-muted capitalize">{product.category.replace(/-/g, ' ')}</span>
      </div>

      {/* Name */}
      <h1 className="font-heading font-bold text-2xl lg:text-3xl text-primary-dark leading-tight">
        {product.name}
      </h1>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <p className="font-heading font-bold text-3xl text-primary">{formatPrice(product.price)}</p>
        <p className="font-body text-sm text-slate-muted">excl. VAT</p>
        <span className="font-body text-xs text-slate-muted">
          ({formatPrice(product.priceVat)} incl. VAT)
        </span>
      </div>

      {/* Stock */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-accent' : 'bg-red-400'}`} />
        <span className={`font-body text-sm font-medium ${stockInfo.color}`}>{stockInfo.label}</span>
      </div>

      {/* Description */}
      <div className="border-t border-border pt-4">
        {loadingAi ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/6" />
          </div>
        ) : (
          <>
            <p className="font-body text-sm text-slate leading-relaxed">
              {needsAi ? (aiDesc || product.description) : product.description}
            </p>
            {isAiDesc && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-body font-semibold rounded border border-blue-100">
                ✦ AI Generated
              </span>
            )}
          </>
        )}
      </div>

      {/* Specs table */}
      <div className="border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm font-body">
          <tbody>
            {specs.map((spec, i) => (
              <tr key={spec.label} className={i % 2 === 0 ? 'bg-surface' : 'bg-white'}>
                <td className="px-4 py-2.5 text-slate-muted font-medium w-2/5">{spec.label}</td>
                <td className="px-4 py-2.5 text-primary-dark">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Certifications */}
      {product.certifications && product.certifications.length > 0 && (
        <div>
          <p className="font-body text-xs text-slate-muted uppercase tracking-wider mb-2 font-semibold">Certifications</p>
          <div className="flex flex-wrap gap-2">
            {product.certifications.map((cert) => (
              <span key={cert} className="px-2.5 py-1 bg-primary-50 text-primary text-[11px] font-body font-semibold rounded border border-primary-100">
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scarcity & velocity indicators */}
      <ScarcityBadge itemCode={product.id} />

      {/* Tiered pricing */}
      <TieredPricingBar itemCode={product.id} basePrice={product.price} />

      {/* Qty + Add to cart */}
      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex items-center gap-4">
          <span className="font-body text-sm text-slate-muted font-medium">Quantity:</span>
          <QuantitySelector
            value={quantity}
            min={product.minOrderQty}
            max={product.stock}
            onChange={setQuantity}
          />
        </div>
        <AddToCartButton product={product} quantity={quantity} />
      </div>

      {/* Tags */}
      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-surface border border-border text-[11px] font-body text-slate-light rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Smart WhatsApp enquiry */}
      <div className="pt-2">
        <SmartWhatsAppButton
          context={{
            type: 'product',
            productName: product.name,
            productSku: product.sku,
            productBrand: product.brand,
          }}
          label="Enquire via WhatsApp"
        />
      </div>
    </div>
  )
}
