// Run once to set up the Google Sheet: npx ts-node --project tsconfig.json scripts/seed-sheets.ts
import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Add named sheets (tabs). The spreadsheet must already exist.
  // Delete the default "Sheet1" if present, then add our tabs.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingTitles = meta.data.sheets?.map(s => s.properties?.title) ?? []

  const tabsToCreate = ['Products', 'Orders', 'Reserved', 'Lock', 'PakistanStock', 'PakistanStockFiles'].filter(
    t => !existingTitles.includes(t)
  )

  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: tabsToCreate.map(title => ({
          addSheet: { properties: { title } },
        })),
      },
    })
    console.log(`Created tabs: ${tabsToCreate.join(', ')}`)
  }

  // Products: headers + initial data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Products!A1:I1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['article', 'size_cm', 'gsm', 'wt_pc', 'cartons', 'qty_total', 'price_usd', 'version', 'min_sale_usd']],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Products!A2:I9',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['HAND TOWEL',  '50x100',  460, 230, 23, 1840, 1.80, 1, 1.60],
        ['BATH TOWEL',  '70x140',  460, 451, 46, 1840, 3.12, 1, 2.80],
        ['HAND TOWEL',  '50x100',  500, 250, 23, 1840, 1.92, 1, 1.70],
        ['BATH TOWEL',  '70x140',  500, 490, 50, 2000, 3.36, 1, 3.00],
        ['BATH SHEET',  '100x150', 500, 750, 15,  420, 4.91, 1, 4.40],
        ['POOL TOWEL',  '90x180',  440, 713, 16,  448, 4.89, 1, 4.40],
        ['BATHMAT',     '50x70',   550, 193, 13, 1040, 1.64, 1, 1.45],
        ['BATHMAT',     '50x70',   650, 228, 14, 1120, 1.87, 1, 1.65],
      ],
    },
  })
  console.log('Products seeded.')

  // Orders: headers only
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A1:I1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['order_id', 'created_at', 'customer_name', 'customer_contact', 'status', 'currency', 'items_json', 'total_amount', 'confirmed_at']],
    },
  })
  console.log('Orders headers set.')

  // Reserved: headers only
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Reserved!A1:C1',
    valueInputOption: 'RAW',
    requestBody: { values: [['article_size_key', 'reserved_qty', 'order_id']] },
  })
  console.log('Reserved headers set.')

  // Lock: header + initial FREE state
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Lock!A1:B2',
    valueInputOption: 'RAW',
    requestBody: { values: [['status', 'locked_at'], ['FREE', '']] },
  })
  console.log('Lock initialized.')

  // PakistanStockFiles: headers only
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStockFiles!A1:G1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['file_id', 'display_name', 'description', 'original_filename', 'stored_filename', 'mime_type', 'uploaded_at']],
    },
  })
  console.log('PakistanStockFiles headers set.')

  console.log('\nGoogle Sheets seeded successfully!')
  console.log('All 4 tabs ready: Products, Orders, Reserved, Lock')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
