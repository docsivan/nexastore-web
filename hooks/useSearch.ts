'use client'

import { useState, useCallback, useRef } from 'react'
import { Product } from '@/lib/types'
import { trackSearch } from '@/lib/analytics'
import { getOrCreateSessionId } from '@/lib/sessionId'
import { clarityEvent } from '@/lib/clarity'

// ─── Fuzzy local search (instant, no API) ────────────────────────────────────
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 90
  if (t.includes(q)) return 80
  const words = t.split(/\s+/)
  if (words.some((w) => w.startsWith(q))) return 70
  // Typo tolerance
  let qi = 0, matched = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { matched++; qi++ }
  }
  const ratio = matched / q.length
  if (ratio >= 0.75) return Math.round(ratio * 60)
  return 0
}

function localSearch(products: Product[], query: string): Product[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  const scored = products.map((p) => {
    const score =
      fuzzyScore(p.name, q) * 3 +
      fuzzyScore(p.brand, q) * 2 +
      fuzzyScore(p.category.replace(/-/g, ' '), q) * 1.5 +
      fuzzyScore(p.sku, q) * 2 +
      Math.max(0, ...(p.tags ?? []).map((t) => fuzzyScore(t, q))) * 1.2 +
      fuzzyScore(p.description ?? '', q) * 0.5
    return { product: p, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.product)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSearch(allProducts?: Product[]) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isAI,        setIsAI]        = useState(false)
  const geminiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)

    if (!q.trim()) {
      setResults([])
      setHasSearched(false)
      setIsSearching(false)
      setIsAI(false)
      if (geminiTimer.current) clearTimeout(geminiTimer.current)
      return
    }

    // Step 1: Instant local fuzzy results (0ms)
    if (allProducts && allProducts.length > 0) {
      const instant = localSearch(allProducts, q)
      setResults(instant)
      setHasSearched(true)
      setIsAI(false)
      trackSearch(q, instant.length)
      clarityEvent('search', q)
    } else {
      setIsSearching(true)
      setHasSearched(true)
    }

    // Step 2: AI enhancement + signal after 700ms pause
    if (geminiTimer.current) clearTimeout(geminiTimer.current)
    geminiTimer.current = setTimeout(async () => {
      if (q.trim().length < 2) return
      const sessionId = getOrCreateSessionId()
      fetch('/api/nexa/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_type: 'search',
          session_id:  sessionId,
          query:       q,
          action:      'search',
          page_url:    typeof window !== 'undefined' ? window.location.href : '',
        }),
      }).catch(() => {})
      // Only show spinner if we have no local results yet
      const hasLocalResults = allProducts && allProducts.length > 0
      if (!hasLocalResults) setIsSearching(true)
      try {
        const res  = await fetch('/api/search?q=' + encodeURIComponent(q))
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          setResults(json.data)
          setIsAI(json.ai ?? false)
        }
      } catch {
        // keep local results — AI unavailable, fuzzy results already shown
        if (!hasLocalResults) {
          const fallback = localSearch(allProducts ?? [], q)
          if (fallback.length > 0) { setResults(fallback); setHasSearched(true) }
        }
      } finally {
        setIsSearching(false)
      }
    }, 700)
  }, [allProducts])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setIsAI(false)
    setIsSearching(false)
    if (geminiTimer.current) clearTimeout(geminiTimer.current)
  }, [])

  return { query, results, isSearching, hasSearched, isAI, search, clearSearch }
}
