// Zevio — ERPNext connection test
// Run: npx tsx scripts/test-erpnext-connection.ts

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('Testing ERPNext connection...')
  console.log('URL:', process.env.ERPNEXT_URL)

  const { testConnection, erpGet } = await import('../lib/erpnext')

  const connected = await testConnection()
  if (connected) {
    console.log('✅ ERPNext connection successful')
    const companies = await erpGet('Company', 'fields=["name","abbr","country"]&limit=5')
    console.log('Companies:', JSON.stringify(companies, null, 2))
  } else {
    console.log('❌ ERPNext connection failed — check API keys')
  }
}

main().catch(console.error)
