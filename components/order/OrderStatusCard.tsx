import { Order, OrderStatus } from '@/lib/types'
import { formatPrice, formatDate } from '@/lib/formatters'

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'confirmed', label: 'Order Confirmed', icon: '✓' },
  { key: 'processing', label: 'Processing', icon: '⚙' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: 'delivered' },
]

const statusIndex = (status: OrderStatus) =>
  STATUS_STEPS.findIndex((s) => s.key === status)

interface Props { order: Order }

export default function OrderStatusCard({ order }: Props) {
  const currentStep = statusIndex(order.status)

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-body text-xs text-slate-muted mb-1">Order Number</p>
          <p className="font-heading font-bold text-lg text-primary">#{order.id}</p>
        </div>
        <div className="text-right">
          <p className="font-body text-xs text-slate-muted mb-1">Order Date</p>
          <p className="font-body text-sm font-medium text-slate">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between relative z-10">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep
            const active = i === currentStep
            return (
              <div key={step.key} className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                  done ? 'bg-primary text-white' : 'bg-surface border-2 border-border text-slate-muted'
                } ${active ? 'ring-4 ring-primary-50' : ''}`}>
                  {step.icon}
                </div>
                <p className={`font-body text-[10px] text-center ${done ? 'text-primary font-semibold' : 'text-slate-muted'}`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>
        {/* Progress line */}
        <div className="absolute top-[18px] left-[18px] right-[18px] h-0.5 bg-border z-0">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Order items */}
      <div className="mb-5">
        <h4 className="font-heading font-semibold text-sm text-primary-dark mb-3">Items Ordered</h4>
        <div className="flex flex-col gap-2">
          {order.items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between items-center font-body text-sm">
              <span className="text-slate">{product.name} × {quantity}</span>
              <span className="font-medium text-primary-dark">{formatPrice(product.price * quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-4 flex flex-col gap-1.5 font-body text-sm">
        <div className="flex justify-between text-slate">
          <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate">
          <span>VAT (5%)</span><span>{formatPrice(order.vat)}</span>
        </div>
        <div className="flex justify-between font-heading font-bold text-primary-dark text-base pt-1">
          <span>Total</span><span>{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  )
}
