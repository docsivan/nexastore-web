declare global {
  interface Window {
    clarity?: (method: string, ...args: unknown[]) => void
  }
}

export function clarityEvent(name: string, value?: string): void {
  if (typeof window === 'undefined') return
  if (typeof window.clarity !== 'function') return
  window.clarity('event', name, ...(value !== undefined ? [value] : []))
}
