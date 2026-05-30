// AI provider chain — Groq primary, OpenRouter fallback. No Anthropic or Google.
// Tier 1: Groq llama-3.1-70b-versatile
// Tier 2: Groq llama-3.1-8b-instant
// Tier 3: OpenRouter mistralai/mistral-7b-instruct:free
// Tier 4: OpenRouter meta-llama/llama-3-8b-instruct:free

const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

type Tier = { url: string; key: string | undefined; model: string; tag: string }

const TIERS: Tier[] = [
  { url: GROQ_URL,       key: process.env.GROQ_API_KEY,       model: 'llama-3.3-70b-versatile',             tag: 'groq-70b'   },
  { url: GROQ_URL,       key: process.env.GROQ_API_KEY,       model: 'llama-3.1-8b-instant',                tag: 'groq-8b'    },
  { url: OPENROUTER_URL, key: process.env.OPENROUTER_API_KEY, model: 'mistralai/mistral-7b-instruct:free',  tag: 'or-mistral' },
  { url: OPENROUTER_URL, key: process.env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3-8b-instruct:free', tag: 'or-llama'   },
]

async function callWithFallback(
  prompt:       string,
  systemPrompt: string,
  maxTokens:    number
): Promise<string> {
  let lastError: Error | null = null

  for (const tier of TIERS) {
    if (!tier.key) continue
    try {
      const res = await fetch(tier.url, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tier.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      tier.model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`[${tier.tag}] ${res.status}: ${err}`)
      }

      const data = await res.json()
      const text: string | undefined = data.choices?.[0]?.message?.content
      if (!text) throw new Error(`[${tier.tag}]: empty content`)
      return text
    } catch (err) {
      console.error(`[ai] ${tier.tag} failed:`, (err as Error).message)
      lastError = err as Error
    }
  }

  throw lastError ?? new Error('All AI tiers exhausted')
}

export function callHaiku(prompt: string, systemPrompt: string): Promise<string> {
  return callWithFallback(prompt, systemPrompt, 1000)
}

export function callSonnet(prompt: string, systemPrompt: string): Promise<string> {
  return callWithFallback(prompt, systemPrompt, 4000)
}
