const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

async function callClaude(
  model: string,
  maxTokens: number,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key':         process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    const error = new Error(`Claude [${model}] ${res.status}: ${err}`)
    console.error('[claude]', error.message)
    throw error
  }

  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error(`Claude [${model}]: empty content`)
  return text
}

export async function callHaiku(prompt: string, systemPrompt: string): Promise<string> {
  return callClaude(
    process.env.CLAUDE_HAIKU_MODEL ?? 'claude-haiku-4-5-20251001',
    1000,
    prompt,
    systemPrompt
  )
}

export async function callSonnet(prompt: string, systemPrompt: string): Promise<string> {
  return callClaude(
    process.env.CLAUDE_SONNET_MODEL ?? 'claude-sonnet-4-6',
    4000,
    prompt,
    systemPrompt
  )
}
