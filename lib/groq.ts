import { callHaiku } from './claude'

export interface ChatMessage {
  role:    'user' | 'assistant' | 'system'
  content: string
}

export async function callGroq(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const turns = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
  return callHaiku(turns || 'Hello', systemPrompt)
}
