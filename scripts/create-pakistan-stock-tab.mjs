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
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existing = meta.data.sheets.map(s => s.properties.title)
  console.log('Existing tabs:', existing.join(', '))

  if (existing.includes('PakistanStock')) {
    console.log('PakistanStock tab already exists — skipping creation.')
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: 'PakistanStock' } } }],
      },
    })
    console.log('Created PakistanStock tab.')
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStock!A1:I1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['item_id', 'article', 'size_cm', 'gsm', 'wt_pc', 'cartons', 'qty_total', 'status', 'created_at']],
    },
  })
  console.log('Header row written.')

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStock!A1:I1',
  })
  console.log('Verified header:', check.data.values?.[0]?.join(', '))
  console.log('Done. PakistanStock tab is ready.')
}

run().catch(err => { console.error(err.message); process.exit(1) })
