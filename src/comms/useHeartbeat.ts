import { useEffect } from 'react'
import { upsertPresence } from './commsRepo'
import type { Presence } from './types'

const HEARTBEAT_MS = 30_000

export function useHeartbeat(presence: Omit<Presence, 'lastSeen'> | null): void {
  const key = presence ? `${presence.id}|${presence.booth}|${presence.mode}|${presence.station ?? ''}` : null

  useEffect(() => {
    if (!presence) return
    const beat = () => { upsertPresence({ ...presence, lastSeen: Date.now() }) }
    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
