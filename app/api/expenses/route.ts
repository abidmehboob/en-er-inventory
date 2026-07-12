import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readExpenses, appendExpenseRow } from '@/lib/sheets'
import { v4 as uuidv4 } from 'uuid'
import type { ExpenseCategory, ExpenseCurrency } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await readExpenses()
  return NextResponse.json([...expenses].reverse())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    date: string
    category: ExpenseCategory
    amount: number
    currency: ExpenseCurrency
    notes?: string
  }

  if (!body.date || !body.category || !body.amount || !body.currency) {
    return NextResponse.json({ error: 'Missing required fields: date, category, amount, currency' }, { status: 400 })
  }

  const VALID_CATEGORIES: ExpenseCategory[] = ['Rent', 'Shipping', 'Utilities', 'Salaries', 'Other']
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  if (body.currency !== 'PLN' && body.currency !== 'EUR') {
    return NextResponse.json({ error: 'Currency must be PLN or EUR' }, { status: 400 })
  }

  if (body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const expense = {
    expense_id: uuidv4(),
    date: body.date,
    category: body.category,
    amount: Math.round(body.amount * 100) / 100,
    currency: body.currency,
    notes: body.notes || '',
    created_at: new Date().toISOString(),
  }

  await appendExpenseRow(expense)
  return NextResponse.json({ expense_id: expense.expense_id }, { status: 201 })
}
