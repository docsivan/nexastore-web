'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/context/ChatContext'

const QUICK_PROMPTS = [
  { label: 'Find Products', text: 'What infection control products do you have in stock?' },
  { label: 'Build Monthly Order', text: 'Help me build a monthly order for a 20-bed hospital' },
  { label: 'Track Order', text: 'I want to track my order' },
  { label: 'Dental Supplies', text: 'What dental supplies do you carry?' },
  { label: 'PPE Stock', text: 'Show me your PPE products and current stock' },
  { label: 'Volume Pricing', text: 'Do you offer volume discounts for bulk orders?' },
]

export default function ChatPage() {
  const { messages, isLoading, sendMessage, clearChat } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* Page Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: '#0D0D0D' }}>
            H
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Nexa Assistant</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm text-gray-500">AI Procurement Advisor — NexaStore</span>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-4">

        {/* Quick Prompts — show only at start */}
        {messages.length === 1 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 text-center">Quick start — tap a topic below</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.text)}
                  className="text-left px-4 py-3 rounded-xl border bg-white hover:shadow-md transition-all text-sm font-medium"
                  style={{ borderColor: '#e2e8f0', color: '#0D0D0D' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#0D0D0D')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1"
                style={{ background: '#0D0D0D' }}>
                H
              </div>
            )}

            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
            }`}
              style={msg.role === 'user' ? { background: '#0D0D0D' } : {}}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-xs opacity-40">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.intent && msg.role === 'assistant' && (
                  <span className="text-xs opacity-40 capitalize">
                    {msg.intent.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1 bg-gray-400">
                You
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#0D0D0D' }}>
              H
            </div>
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about products, build an order, or track a delivery..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-sm outline-none focus:border-blue-400 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
            style={{ background: '#F5A623' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Nexa Assistant · Powered by AI · For procurement guidance only
        </p>
      </div>
    </div>
  )
}
