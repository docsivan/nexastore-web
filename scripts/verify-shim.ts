// Throwaway runtime check: proves the Supabase shim returns Airtable-shaped records.
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const m = await import('../lib/supabase')

  const prods = await m.getProducts()
  console.log('getProducts() ->', prods.length, 'rows')
  if (prods[0]) {
    console.log('  record keys :', Object.keys(prods[0]).join(', '))
    console.log('  .id         :', prods[0].id)
    console.log('  .createdTime:', prods[0].createdTime)
    console.log('  .fields.item_code:', prods[0].fields.item_code)
    console.log('  .fields.name     :', prods[0].fields.name)
    console.log('  .fields.final_price:', prods[0].fields.final_price)
  } else {
    console.log('  (products table empty — migration script not run yet)')
  }

  const tiers = await m.getPricingTiers()
  console.log('getPricingTiers() ->', tiers.length, 'rows')
  if (tiers[0]) {
    console.log('  .fields:', JSON.stringify(tiers[0].fields))
  }

  const orders = await m.getAllOrders(5)
  console.log('getAllOrders() ->', orders.length, 'rows')
  if (orders[0]) {
    console.log('  items is string?', typeof orders[0].fields.items)
    console.log('  JSON.parse ok?', Array.isArray(JSON.parse(orders[0].fields.items || '[]')))
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
