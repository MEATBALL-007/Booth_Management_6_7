import { useEffect, useState } from 'react'
import type { Presence } from './types'
import { subscribePresence } from './commsRepo'
import { isOnline } from './commsLogic'
import { L } from '../i18n/labels'

export function PresenceBoard() {
  const [presence, setPresence] = useState<Presence[]>([])
  useEffect(() => subscribePresence(setPresence), [])
  const now = Date.now()

  return (
    <section>
      <h2 className="font-kanit opacity-80 mb-2">{L('comms.presence').th} · {L('comms.presence').en}</h2>
      <div className="flex flex-col gap-1">
        {presence.map((p) => {
          const online = isOnline(p, now)
          return (
            <div key={p.id} data-testid="presence-row" className="font-mono text-sm flex items-center gap-2">
              <span className={online ? 'text-green-400' : 'text-red-400'}>●</span>
              <span>{L(`booth.${p.booth}`).th} · {p.mode}{p.station ? ` ${p.station}` : ''}</span>
              <span className="opacity-60">{online ? L('comms.online').th : L('comms.offline').th}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
