import { callSonnet } from './claude'

function parseAgentJSON<T>(raw: string): T[] {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

export type CMORecommendation = {
  insight_type: 'cmo_recommendation'
  insight_text: string
  action_required: string
  priority: string
}

export type CROFix = {
  insight_type: 'cro_fix'
  page_url: string
  insight_text: string
  action_required: string
  priority: string
}

export type InventoryAlert = {
  insight_type: 'inventory_alert'
  insight_text: string
  action_required: string
  priority: string
  item_code: string
  urgency: 'CRITICAL' | 'URGENT' | 'WATCH'
}

export type DemandForecast = {
  insight_type: 'demand_forecast'
  insight_text: string
  action_required: string
  priority: string
  category: string
  trend: string
}

export type RevenueLeak = {
  insight_type: 'revenue_leak'
  insight_text: string
  action_required: string
  priority: string
  item_code: string
}

export async function runCMOAgent(data: unknown): Promise<CMORecommendation[]> {
  const system = `You are Haya's AI CMO for NexaStore.
Analyse this week's data and create a specific marketing plan.
Return JSON array of exactly 5 objects:
[{insight_type:'cmo_recommendation', insight_text, action_required, priority}]
1. Flash sale: which product, what discount %, why this week
2. Homepage feature: which product to surface, which badge
3. Customer segment to target: which segment + what message
4. Content gap: which topic to write about this week
5. Search opportunity: which rising query to target
Be specific with product names and OMR figures. Return JSON only.`

  const raw = await callSonnet(JSON.stringify(data), system)
  return parseAgentJSON<CMORecommendation>(raw)
}

export async function runCROAgent(data: unknown): Promise<CROFix[]> {
  const system = `You are Haya's AI CRO specialist for NexaStore.
Analyse conversion data and Clarity behavioural signals.
For each problem, give ONE specific actionable fix. Name exact elements.
Return JSON array: [{insight_type:'cro_fix', page_url, insight_text, action_required, priority}]
Return JSON only.`

  const raw = await callSonnet(JSON.stringify(data), system)
  return parseAgentJSON<CROFix>(raw)
}

export async function runInventoryAgent(data: unknown): Promise<InventoryAlert[]> {
  const system = `You are Haya's AI Inventory specialist for NexaStore.
Analyse stock data. Flag days_to_stockout < 7 as CRITICAL, < 21 as URGENT. Name brand and recommend exact reorder quantity.
Return JSON array: [{insight_type:'inventory_alert', insight_text, action_required, priority, item_code, urgency}]
Return JSON only.`

  const raw = await callSonnet(JSON.stringify(data), system)
  return parseAgentJSON<InventoryAlert>(raw)
}

export async function runDemandAgent(data: unknown): Promise<DemandForecast[]> {
  const system = `You are Haya's AI Demand Forecaster for NexaStore.
Analyse 90 days of sales and current search trends.
Forecast demand per category for next 30 days.
Consider Ramadan patterns, flu season, MOH audit cycles.
Return JSON array: [{insight_type:'demand_forecast', insight_text, action_required, priority, category, trend}]
Return JSON only.`

  const raw = await callSonnet(JSON.stringify(data), system)
  return parseAgentJSON<DemandForecast>(raw)
}

export async function runRevenuLeakAgent(data: unknown): Promise<RevenueLeak[]> {
  const system = `You are Haya's AI CFO for NexaStore.
Identify revenue leaks — capital tied up in slow-moving stock.
Flag products where (stock_quantity × cost_price) > OMR 50 AND orders in last 30 days < 2.
Recommend specific discount % to clear. Still show margin.
Return JSON array: [{insight_type:'revenue_leak', insight_text, action_required, priority, item_code}]
Return JSON only.`

  const raw = await callSonnet(JSON.stringify(data), system)
  return parseAgentJSON<RevenueLeak>(raw)
}
