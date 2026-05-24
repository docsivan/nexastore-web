import { generateContent } from './gemini'

export interface HayaDecision {
  action: string
  target: string
  field: string
  value: string | number
  reason: string
}

export async function runHayaIntelligence(
  contextData: object,
  systemPrompt: string
): Promise<HayaDecision[]> {
  const prompt = `${systemPrompt}

Context data (JSON):
${JSON.stringify(contextData, null, 2)}

Return a JSON array of decisions. Each decision must have: action, target, field, value, reason.
Maximum 20 decisions. Return ONLY a valid JSON array, no other text.`

  const raw = await generateContent(prompt, 0.3, 2048)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    const decisions = JSON.parse(match[0])
    if (!Array.isArray(decisions)) return []
    return decisions.slice(0, 20).filter(
      (d: unknown) =>
        d !== null &&
        typeof d === 'object' &&
        typeof (d as HayaDecision).action === 'string' &&
        typeof (d as HayaDecision).target === 'string'
    ) as HayaDecision[]
  } catch {
    return []
  }
}
