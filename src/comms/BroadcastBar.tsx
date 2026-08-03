import { useState } from 'react'
import type { BoothId } from '../domain/types'
import { sendMessage } from './commsRepo'
import { getDeviceId } from '../device/deviceId'
import { L } from '../i18n/labels'

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
    <section className="flex flex-col gap-2 max-w-md">
      <h2 className="font-kanit opacity-80">{L('comms.broadcastSend').th} · {L('comms.broadcastSend').en}</h2>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label={L('comms.broadcastSend').th}
          className="flex-1 rounded bg-black/40 px-2 py-2 text-white" />
        <button onClick={send} className="rounded-lg px-4 py-2 bg-phantom-yellow text-phantom-bg font-kanit">
          {L('comms.send').th}
        </button>
      </div>
      {error && <p role="alert" className="text-red-400 font-kanit text-sm">{L('comms.sendError').th}</p>}
    </section>
  )
}
