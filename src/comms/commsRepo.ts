import { collection, addDoc, onSnapshot, doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Message, Presence } from './types'

export async function sendMessage(msg: Omit<Message, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'messages'), msg)
  return ref.id
}

export function subscribeMessages(cb: (messages: Message[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'messages'), (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }))
    cb(messages.sort((a, b) => a.createdAt - b.createdAt))
  })
}

export async function ackMessage(id: string, deviceId: string): Promise<void> {
  await updateDoc(doc(getDb(), 'messages', id), { ackBy: arrayUnion(deviceId) })
}

export async function upsertPresence(p: Presence): Promise<void> {
  await setDoc(doc(getDb(), 'presence', p.id), p, { merge: true })
}

export function subscribePresence(cb: (presence: Presence[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'presence'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Presence, 'id'>) })))
  })
}
