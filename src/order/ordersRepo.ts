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
  // An explicit `undefined` means "this field should not exist" — Firestore has
  // no such value, so it needs the deleteField() sentinel. Undo patches rely on
  // this to clear fields the action introduced; ordinary patches never carry an
  // undefined key, so their behaviour is unchanged.
  const write: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(patch)) {
    write[field] = value === undefined ? deleteField() : value
  }
  await updateDoc(doc(getDb(), 'orders', id), write)
}
