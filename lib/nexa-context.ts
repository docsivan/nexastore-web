import { getCustomerMemory, getSessionSearches } from './memory'

export async function buildMemoryContext(
  session_id: string,
  customer_id?: string
): Promise<string> {
  const [searches, customerMemory] = await Promise.all([
    getSessionSearches(session_id),
    customer_id ? getCustomerMemory(customer_id) : Promise.resolve([]),
  ])

  const viewedItems = customerMemory
    .filter(s => s.signal_type === 'view')
    .map(s => s.item_code)
    .filter(Boolean)
    .slice(0, 5)

  const lastOrder = customerMemory.find(s => s.signal_type === 'order')
  const segment   = customerMemory.find(s => s.customer_segment)?.customer_segment

  const lines: string[] = ['CUSTOMER MEMORY:']
  if (searches.length > 0)   lines.push(`Last searches this session: ${searches.join(', ')}`)
  if (viewedItems.length > 0) lines.push(`Products viewed this session: ${viewedItems.join(', ')}`)
  if (lastOrder)              lines.push(`Last order action: ${lastOrder.action}`)
  if (segment)                lines.push(`Customer segment: ${segment}`)

  return lines.length > 1 ? lines.join('\n') : ''
}
