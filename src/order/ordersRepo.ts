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

export async function updateOrderStatus(id: string, patch: Partial<Order>): Promise<void> {
  // An explicit undefined means "remove this field" (an undo restoring an order to a state
  // where the field did not exist). Firestore only removes a field via deleteField();
  // updateDoc would otherwise merge and leave the old value in place.
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    payload[key] = value === undefined ? deleteField() : value
  }
  await updateDoc(doc(getDb(), 'orders', id), payload)
}
