import { collection, addDoc, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore'
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

export async function updateOrderStatus(id: string, patch: Partial<Order>): Promise<void> {
  await updateDoc(doc(getDb(), 'orders', id), patch)
}
