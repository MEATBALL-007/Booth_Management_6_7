import { useState } from 'react'
import type { BoothId } from '../domain/types'
import { sendMessage } from './commsRepo'
import { getDeviceId } from '../device/deviceId'
import { L } from '../i18n/labels'
import { Button } from '../ui/Button'

export function BroadcastBar({ booth }: { booth: BoothId }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)

  const send = () => {
    if (!text.trim()) return
    setError(false)
    sendMessage({
      fromDeviceId: getDeviceId(), fromBooth: booth, fromMode: 'dashboard',
      scope: 'all', kind: 'broadcast', text: text.trim(), createdAt: Date.now(), ackBy: [],
    }).catch(() => setError(true))
    setText('')
  }

  return (
    <section className="flex max-w-md flex-col gap-2">
      <h2 className="font-kanit text-sm uppercase tracking-wide text-phantom-muted">
        {L('comms.broadcastSend').th} · {L('comms.broadcastSend').en}
      </h2>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={L('comms.broadcastSend').th}
          placeholder={L('comms.broadcastSend').th}
          className="min-h-[44px] flex-1 rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 text-phantom-text focus:border-phantom-yellow/60 focus:outline-none"
        />
        <Button variant="primary" onClick={send} className="min-h-[44px] px-5">
          {L('comms.send').th}
        </Button>
      </div>
      {error && <p role="alert" className="font-kanit text-sm text-phantom-orange">{L('comms.sendError').th}</p>}
    </section>
  )
}
