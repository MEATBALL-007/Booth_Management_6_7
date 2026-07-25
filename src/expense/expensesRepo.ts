import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Expense } from '../domain/types'

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'expenses'), expense)
  return ref.id
}

export function subscribeAllExpenses(cb: (expenses: Expense[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'expenses'), (snap) => {
    const expenses = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }))
    cb(expenses.sort((a, b) => a.createdAt - b.createdAt))
  })
}
