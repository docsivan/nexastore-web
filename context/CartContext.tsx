'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { Cart, CartItem, Product } from '@/lib/types'
import { trackAddToCart } from '@/lib/analytics'
import { getOrCreateSessionId } from '@/lib/sessionId'
import { clarityEvent } from '@/lib/clarity'

// ─── State ───────────────────────────────────────────────────────────────────
interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'HYDRATE'; items: CartItem[] }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.product.id === action.product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: Math.min(i.quantity + action.quantity, i.product.stock) }
              : i
          ),
        }
      }
      return { items: [...state.items, { product: action.product, quantity: action.quantity }] }
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter((i) => i.product.id !== action.productId) }
    case 'UPDATE_QTY':
      if (action.quantity <= 0)
        return { items: state.items.filter((i) => i.product.id !== action.productId) }
      return {
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, quantity: Math.min(action.quantity, i.product.stock) }
            : i
        ),
      }
    case 'CLEAR_CART':
      return { items: [] }
    case 'HYDRATE':
      return { items: action.items }
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface CartContextValue {
  cart: Cart
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (productId: string) => boolean
  getItemQty: (productId: string) => number
}

const CartContext = createContext<CartContextValue | null>(null)

function deriveCart(items: CartItem[]): Cart {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const vat = Math.round(subtotal * 0.05 * 1000) / 1000
  return {
    items,
    subtotal: Math.round(subtotal * 1000) / 1000,
    vat,
    total: Math.round((subtotal + vat) * 1000) / 1000,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hayat_cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        dispatch({ type: 'HYDRATE', items: parsed })
      }
    } catch {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hayat_cart', JSON.stringify(state.items))
    } catch {}
  }, [state.items])

  const cart = deriveCart(state.items)

  const value: CartContextValue = {
    cart,
    addItem: (product, quantity = 1) => {
      dispatch({ type: 'ADD_ITEM', product, quantity })
      clarityEvent('add_to_cart', product.id)
      trackAddToCart({ id: product.id, name: product.name, price: product.price, category: product.category }, quantity)
      const sessionId = getOrCreateSessionId()
      fetch('/api/haya/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_type: 'add_to_cart',
          session_id:  sessionId,
          item_code:   product.id,
          action:      'add_to_cart',
          cart_total:  Math.round((cart.total + product.price * quantity) * 1000) / 1000,
          page_url:    typeof window !== 'undefined' ? window.location.href : '',
        }),
      }).catch(() => {})
    },
    removeItem: (productId) => dispatch({ type: 'REMOVE_ITEM', productId }),
    updateQty: (productId, quantity) => dispatch({ type: 'UPDATE_QTY', productId, quantity }),
    clearCart: () => {
      const recentOrder = typeof window !== 'undefined' && localStorage.getItem('hayat_order_just_placed')
      const isRecentOrder = recentOrder && Date.now() - parseInt(recentOrder) < 30000
      if (!isRecentOrder && state.items.length > 0) {
        const sessionId = getOrCreateSessionId()
        fetch('/api/haya/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signal_type: 'abandon',
            session_id:  sessionId,
            action:      'cart_abandoned',
            cart_total:  cart.total,
            page_url:    typeof window !== 'undefined' ? window.location.href : '',
          }),
        }).catch(() => {})
      }
      dispatch({ type: 'CLEAR_CART' })
    },
    isInCart: (productId) => state.items.some((i) => i.product.id === productId),
    getItemQty: (productId) => state.items.find((i) => i.product.id === productId)?.quantity ?? 0,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCartContext must be used inside CartProvider')
  return ctx
}
