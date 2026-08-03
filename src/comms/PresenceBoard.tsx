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
      <h2 className="mb-2 font-kanit text-sm uppercase tracking-wide text-phantom-muted">
        {L('comms.presence').th} · {L('comms.presence').en}
      </h2>
      <div className="flex flex-col gap-1.5">
        {presence.map((p) => {
          const online = isOnline(p, now)
          return (
            <div
              key={p.id}
              data-testid="presence-row"
              className="flex min-h-[44px] items-center gap-3 rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 font-mono text-sm text-phantom-text"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-phantom-success animate-pulse' : 'bg-phantom-orange/70'}`}
              />
              <span className="flex-1">
                {L(`booth.${p.booth}`).th} · {p.mode}{p.station ? ` ${p.station}` : ''}
              </span>
              <span className={online ? 'text-phantom-success' : 'text-phantom-muted'}>
                {online ? L('comms.online').th : L('comms.offline').th}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
