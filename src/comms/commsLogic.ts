import type { Message, Presence } from './types'
import type { BoothId } from '../domain/types'

const ONLINE_THRESHOLD_MS = 90_000

export function isOnline(p: Presence, now: number, thresholdMs: number = ONLINE_THRESHOLD_MS): boolean {
  return now - p.lastSeen < thresholdMs
}

export function visibleMessages(messages: Message[], myBooth: BoothId, myDeviceId: string): Message[] {
  return messages
    .filter((msg) => (msg.scope === 'all' || msg.scope === myBooth))
    .filter((msg) => msg.fromDeviceId !== myDeviceId)
    .filter((msg) => !msg.ackBy.includes(myDeviceId))
    .sort((a, b) => b.createdAt - a.createdAt)
}
