import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteField } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Order, BoothId } from '../domain/types'

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'orders'), order)
  return ref.id
}

export function subscribeBoothOrders(boothId: BoothId, cb: (orders: Order[]) => void): () => void {
  const q = query(collection(getDb(), 'orders'), where('boothId', '==', boothId))
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
    cb(orders.sort((a, b) => a.createdAt - b.createdAt))
  })
}

export function subscribeAllOrders(cb: (orders: Order[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'orders'), (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
    cb(orders.sort((a, b) => a.createdAt - b.createdAt))
  })
}

// An explicit `undefined` in the patch means "remove this field". Firestore has no way to
// store undefined, and updateDoc merges, so the only way to drop a field an action created
// (the undo case) is the deleteField() sentinel. Ordinary action patches never hold
// undefined, so this leaves every existing write untouched.
export async function updateOrderStatus(id: string, patch: Partial<Order>): Promise<void> {
  const payload: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(patch)) {
    payload[field] = value === undefined ? deleteField() : value
  }
  await updateDoc(doc(getDb(), 'orders', id), payload)
}
