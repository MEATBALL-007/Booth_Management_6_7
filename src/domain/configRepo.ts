import { doc, onSnapshot } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { GlobalConfig } from './types'

/**
 * The single event-wide config document.
 *
 * The HQ spec's data model names this location exactly
 * (`/config/global (เพิ่ม field) donationTarget: number`), so the donation goal
 * is read from Firestore rather than baked into the bundle: every Display and
 * both HQ machines then read one number, and Firestore's persistent cache keeps
 * it readable after the device goes offline.
 *
 * Nothing in this app writes this document — it is set once by hand before the
 * event. A missing doc is therefore an ordinary state, not an error: callers
 * get `null` and fall back to showing the amount with no goal bar.
 */
export function subscribeGlobalConfig(cb: (config: Partial<GlobalConfig> | null) => void): () => void {
  return onSnapshot(doc(getDb(), 'config', 'global'), (snap) => {
    cb(snap.exists() ? (snap.data() as Partial<GlobalConfig>) : null)
  })
}
