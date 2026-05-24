'use client'

import { createContext, useContext, useState, useRef, ReactNode } from 'react'
import { Product } from '@/lib/types'
import { CustomerSession } from '@/lib/session'
import { getOrCreateSessionId } from '@/lib/sessionId'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  intent?: string
  products?: Product[]
  timestamp: Date
}

interface ChatContextType {
  messages: Message[]
  isOpen: boolean
  isLoading: boolean
  sendMessage: (text: string, customer?: CustomerSession | null) => Promise<void>
  toggleWidget: () => void
  clearChat: () => void
  saveChat: (customer: CustomerSession) => Promise<void>
}

const ChatContext = createContext<ChatContextType | null>(null)

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  content: 'Hello! I am **Nexa Assistant**.\nI can help you find products, build your monthly order, or track a delivery.\n\nWhat are you looking for today?',
  timestamp: new Date(),
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [isOpen, setIsOpen]     = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const sessionId = useRef(`chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)

  const sendMessage = async (text: string, customer?: CustomerSession | null) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = [...messages, userMsg]
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:   history,
          customer:   customer ? { name: customer.customer_name, clinic: customer.clinic_name, city: customer.city, phone: customer.phone } : null,
          session_id: getOrCreateSessionId(),
        }),
      })

      const data = await res.json()

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        intent: data.intent,
        products: data.products ?? [],
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having a little trouble right now. Please try again or reach us on WhatsApp.",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const saveChat = async (customer: CustomerSession) => {
    try {
      const intents = messages
        .filter(m => m.intent)
        .map(m => m.intent)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')

      await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:     sessionId.current,
          customer_phone: customer.phone,
          customer_name:  customer.customer_name,
          clinic_name:    customer.clinic_name,
          messages:       messages.map(m => ({
            role:    m.role,
            content: m.content,
            intent:  m.intent || null,
            time:    m.timestamp,
          })),
          intent_summary: intents,
        }),
      })
    } catch (e) {
      console.error('saveChat error:', e)
    }
  }

  const toggleWidget = () => setIsOpen(prev => !prev)

  const clearChat = () => {
    setMessages([{ ...WELCOME, id: Date.now().toString(), timestamp: new Date() }])
    sessionId.current = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  return (
    <ChatContext.Provider value={{ messages, isOpen, isLoading, sendMessage, toggleWidget, clearChat, saveChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
