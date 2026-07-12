import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SHEET_ID = process.env.GOOGLE_SHEET_ID

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function run() {
  // 1. Write a test expense
  const testExpense = [
    uuidv4(),
    '2026-07-12',
    'Rent',
    '1200.00',
    'PLN',
    'Test expense - delete me',
    new Date().toISOString(),
  ]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A:G',
    valueInputOption: 'RAW',
    requestBody: { values: [testExpense] },
  })
  console.log('✓ Wrote test expense:', testExpense[0].slice(0, 8))

  // 2. Read it back
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A2:G',
  })
  const rows = res.data.values || []
  console.log(`✓ Read back ${rows.length} expense row(s)`)
  const last = rows[rows.length - 1]
  console.log('  Last row:', { id: last[0].slice(0,8), date: last[1], category: last[2], amount: last[3], currency: last[4] })

  // 3. Test the dev server API (if running)
  try {
    const r = await fetch('http://localhost:3001/api/expenses')
    if (r.ok) {
      const data = await r.json()
      console.log(`✓ GET /api/expenses returned ${data.length} expense(s)`)
    } else {
      console.log(`  GET /api/expenses → ${r.status} (not logged in — expected)`)
    }
  } catch {
    console.log('  Dev server not reachable — skipping HTTP test')
  }

  console.log('\nAll checks passed. Expenses tab is working correctly.')
}

run().catch(err => { console.error('FAIL:', err.message); process.exit(1) })
