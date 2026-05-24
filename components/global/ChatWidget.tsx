'use client'

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/formatters"

interface Message {
  role: "user" | "assistant"
  content: string
  products?: ProductCard[]
  disclaimer?: boolean
}

interface ProductCard {
  id: string
  name: string
  brand: string
  price: number
  inStock: boolean
  image: string
  category: string
}

const WELCOME: Message = {
  role: "assistant",
  content: "Hello! I am Nexa, your NexaStore assistant. I can help you find products, check availability, or answer procurement questions. How can I help you today?",
}

const SUGGESTIONS = [
  "I need nitrile gloves",
  "Show me infection control products",
  "What dental supplies do you have?",
  "I need sterilization equipment",
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDot, setShowDot] = useState(true)
  const [revealedDisclaimers, setRevealedDisclaimers] = useState<Set<number>>(new Set())
  const [sessionId] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36))
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [hasAcceptedOnce, setHasAcceptedOnce] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => inputRef.current?.focus(), 100)
      setShowDot(false)
    }
  }, [open, messages])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ preloadMessage?: string }>).detail
      setOpen(true)
      if (detail?.preloadMessage) setInput(detail.preloadMessage)
    }
    window.addEventListener('nexa:open', handler)
    return () => window.removeEventListener('nexa:open', handler)
  }, [])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    const userMsg: Message = { role: "user", content: q }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      })
      const json = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: json.message, products: json.products, disclaimer: json.disclaimer }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, having trouble right now. Please WhatsApp us at +968 97780725." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div>
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-full sm:w-96 max-h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-border bg-white"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
                🏥
              </div>
              <div>
                <p className="font-heading font-semibold text-white text-sm">Nexa AI</p>
                <p className="font-body text-white/70 text-xs">NexaStore Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-white/70 text-xs font-body">Online</span>
              <button onClick={() => setOpen(false)} className="ml-2 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Persistent disclaimer banner */}
          {hasAcceptedOnce && !bannerDismissed && (
            <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start justify-between gap-2">
              <p className="text-xs font-body text-amber-700 leading-relaxed">
                <strong>⚠️ Disclaimer:</strong> NexaStore is a medical procurement platform. Information provided is general knowledge only — not clinical advice. Always consult a licensed healthcare professional.
              </p>
              <button onClick={() => setBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0 text-sm leading-none mt-0.5">✕</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/50" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={msg.role === "user" ? "max-w-[85%]" : "max-w-[85%] space-y-2"}>
                  {msg.disclaimer && !revealedDisclaimers.has(i) ? (
                    <div className="rounded-2xl rounded-tl-sm border border-amber-300 bg-amber-50 p-3 shadow-sm space-y-2">
                      <p className="text-xs font-body font-bold text-amber-800 uppercase tracking-wide">
                        ⚠️ MEDICAL PROCUREMENT PLATFORM — NOT A CLINICAL AUTHORITY
                      </p>
                      <p className="text-xs font-body text-amber-700">
                        <strong>NexaStore sells medical products. We do not provide medical advice.</strong> The information below is general knowledge only and does not constitute clinical guidance, diagnosis, or treatment recommendation.
                      </p>
                      <p className="text-xs font-body text-amber-700">
                        Always consult a licensed healthcare professional before making any clinical or patient-care decisions.
                      </p>
                      <button
                        onClick={async () => {
                          setRevealedDisclaimers((prev) => new Set(prev).add(i))
                          setHasAcceptedOnce(true)
                          // Log acceptance to Airtable
                          const session = typeof window !== 'undefined' ? (() => { try { const s = localStorage.getItem('hs_customer'); return s ? JSON.parse(s) : null } catch { return null } })() : null
                          await fetch('/api/chat/disclaimer', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              session_id:     sessionId,
                              question:       messages[i - 1]?.content || '',
                              customer_phone: session?.phone || 'guest',
                              customer_name:  session?.customer_name || 'guest',
                            }),
                          }).catch(() => {})
                        }}
                        className="w-full mt-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-body font-semibold transition-colors"
                      >
                        I understand — I take full responsibility
                      </button>
                    </div>
                  ) : (
                    <div className={
                      msg.role === "user"
                        ? "px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-body leading-relaxed bg-primary text-white"
                        : "px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm font-body leading-relaxed bg-white text-slate shadow-sm border border-border"
                    }>
                      {msg.content}
                    </div>
                  )}
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.products.map((p) => (
                        <Link
                          key={p.id}
                          href={"/products/" + p.id}
                          className="flex items-center gap-3 bg-white border border-border rounded-xl p-2.5 hover:border-primary/40 hover:shadow-sm transition-all group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                            <Image src={p.image} alt={p.name} width={48} height={48} className="object-contain w-full h-full" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-semibold text-xs text-primary-dark line-clamp-1 group-hover:text-primary">{p.name}</p>
                            <p className="font-body text-xs text-slate-muted">{p.brand}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-heading font-bold text-xs text-primary-dark">{formatPrice(p.price)}</span>
                              <span className={p.inStock ? "text-[10px] font-body font-medium text-accent" : "text-[10px] font-body font-medium text-red-500"}>
                                {p.inStock ? "In Stock" : "Out of Stock"}
                              </span>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-slate-muted group-hover:text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-muted/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-muted/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-muted/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs font-body px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-2 bg-white border-t border-border flex-shrink-0">
            
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
            >
              <span className="text-xs font-body font-medium text-green-600">💬 Chat on WhatsApp instead</span>
            </a>
          </div>

          <div className="px-4 py-3 bg-white border-t border-border flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about products, orders..."
                disabled={loading}
                className="flex-1 input-field text-sm py-2"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="btn-primary px-3 py-2 flex-shrink-0 disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg hover:bg-primary-dark transition-all duration-200 hover:scale-110 flex items-center justify-center"
        aria-label="Open chat"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {showDot && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  )
}
