import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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
  // Get existing sheet names
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existing = meta.data.sheets.map(s => s.properties.title)
  console.log('Existing tabs:', existing.join(', '))

  if (existing.includes('Expenses')) {
    console.log('Expenses tab already exists — skipping creation.')
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: 'Expenses' } } }],
      },
    })
    console.log('Created Expenses tab.')
  }

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A1:G1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['expense_id', 'date', 'category', 'amount', 'currency', 'notes', 'created_at']],
    },
  })
  console.log('Header row written.')

  // Verify by reading it back
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A1:G1',
  })
  console.log('Verified header:', check.data.values?.[0]?.join(', '))
  console.log('Done. Expenses tab is ready.')
}

run().catch(err => { console.error(err.message); process.exit(1) })
