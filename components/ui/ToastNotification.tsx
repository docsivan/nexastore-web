'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastType } from '@/lib/types'
import { generateId, cn } from '@/lib/utils'

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

const styles: Record<ToastType, string> = {
  success: 'bg-accent text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-primary text-white',
  warning: 'bg-yellow-500 text-white',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3500) => {
      const id = generateId()
      setToasts((prev) => [...prev, { id, message, type, duration }])
      setTimeout(() => removeToast(id), duration)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-card shadow-modal',
              'font-body text-sm font-medium pointer-events-auto',
              'animate-slide-up min-w-[260px] max-w-xs',
              styles[toast.type]
            )}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {icons[toast.type]}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
