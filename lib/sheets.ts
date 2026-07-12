import { google } from 'googleapis'
import type { Product, Order, ReservedRow, LineItem, Expense } from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function makeProductKey(article: string, size_cm: string, gsm: number) {
  return `${article.replace(/ /g, '_')}_${size_cm}_${gsm}`
}

export function parseProductRow(row: string[]): Product {
  return {
    article: row[0],
    size_cm: row[1],
    gsm: Number(row[2]),
    wt_pc: Number(row[3]),
    cartons: Number(row[4]),
    qty_total: Number(row[5]),
    price_usd: Number(row[6]),
    version: Number(row[7]),
    min_sale_usd: Number(row[8]),
  }
}

export function parseOrderRow(row: string[]): Order {
  return {
    order_id: row[0],
    created_at: row[1],
    customer_name: row[2],
    customer_contact: row[3],
    status: row[4] as Order['status'],
    currency: row[5] as Order['currency'],
    items: JSON.parse(row[6] || '[]') as LineItem[],
    total_amount: Number(row[7]),
    confirmed_at: row[8] || null,
  }
}

export async function readProducts(): Promise<Product[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Products!A2:I',
  })
  return (res.data.values || []).map(row => parseProductRow(row as string[]))
}

export async function readOrders(): Promise<Order[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A2:I',
  })
  return (res.data.values || []).map(row => parseOrderRow(row as string[]))
}

export async function readReserved(): Promise<ReservedRow[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Reserved!A2:C',
  })
  return (res.data.values || []).map((row) => ({
    article_size_key: (row as string[])[0],
    reserved_qty: Number((row as string[])[1]),
    order_id: (row as string[])[2],
  }))
}

export async function readLock(): Promise<{ status: string; locked_at: string }> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Lock!A2:B2',
  })
  const row = res.data.values?.[0] as string[] || ['FREE', '']
  return { status: row[0], locked_at: row[1] }
}

export async function writeLock(status: 'FREE' | 'LOCKED', locked_at: string) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Lock!A2:B2',
    valueInputOption: 'RAW',
    requestBody: { values: [[status, locked_at]] },
  })
}

export async function appendOrderRow(order: Order) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A:I',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        order.order_id, order.created_at, order.customer_name,
        order.customer_contact, order.status, order.currency,
        JSON.stringify(order.items), order.total_amount, order.confirmed_at || '',
      ]],
    },
  })
}

export async function updateOrderStatus(order_id: string, status: Order['status'], confirmed_at?: string) {
  const orders = await readOrders()
  const rowIndex = orders.findIndex(o => o.order_id === order_id)
  if (rowIndex === -1) throw new Error(`Order ${order_id} not found`)
  const sheets = getSheetsClient()
  const sheetRow = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Orders!E${sheetRow}:I${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[status, orders[rowIndex].currency, JSON.stringify(orders[rowIndex].items), orders[rowIndex].total_amount, confirmed_at || '']] },
  })
}

export async function appendReservedRows(rows: ReservedRow[]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Reserved!A:C',
    valueInputOption: 'RAW',
    requestBody: { values: rows.map(r => [r.article_size_key, r.reserved_qty, r.order_id]) },
  })
}

export async function deleteReservedByOrderId(order_id: string) {
  const reserved = await readReserved()
  const toDelete = reserved
    .map((r, i) => ({ ...r, i }))
    .filter(r => r.order_id === order_id)
  if (toDelete.length === 0) return
  const sheets = getSheetsClient()
  for (const row of toDelete) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Reserved!A${row.i + 2}:C${row.i + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '']] },
    })
  }
}

export async function updateProductQty(article: string, size_cm: string, gsm: number, new_qty: number, new_version: number) {
  const products = await readProducts()
  const rowIndex = products.findIndex(
    p => p.article === article && p.size_cm === size_cm && p.gsm === gsm
  )
  if (rowIndex === -1) throw new Error(`Product not found: ${article} ${size_cm} ${gsm}gsm`)
  const sheets = getSheetsClient()
  const sheetRow = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Products!F${sheetRow}:H${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[new_qty, products[rowIndex].price_usd, new_version]] },
  })
}

export function parseExpenseRow(row: string[]): Expense {
  return {
    expense_id: row[0],
    date: row[1],
    category: row[2] as Expense['category'],
    amount: Number(row[3]),
    currency: row[4] as Expense['currency'],
    notes: row[5] || '',
    created_at: row[6],
  }
}

export async function readExpenses(): Promise<Expense[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A2:G',
  })
  return (res.data.values || []).map(row => parseExpenseRow(row as string[]))
}

export async function appendExpenseRow(expense: Expense): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        expense.expense_id,
        expense.date,
        expense.category,
        expense.amount,
        expense.currency,
        expense.notes,
        expense.created_at,
      ]],
    },
  })
}
