import { useState } from 'react'
import type { BoothId, Mode } from '../domain/types'
import type { PresetCode, Message } from './types'
import { sendMessage } from './commsRepo'
import { getDeviceId } from '../device/deviceId'
import { L } from '../i18n/labels'

const PRESETS: { code: PresetCode; labelKey: 'comms.needHelp' | 'comms.lowStock' | 'comms.cleared'; icon: string }[] = [
  { code: 'need_help', labelKey: 'comms.needHelp', icon: '🆘' },
  { code: 'low_stock', labelKey: 'comms.lowStock', icon: '📦' },
  { code: 'cleared', labelKey: 'comms.cleared', icon: '✅' },
]

export function AlertButtons({ booth, mode }: { booth: BoothId; mode: Mode }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)

  const base = () => ({
    fromDeviceId: getDeviceId(), fromBooth: booth, fromMode: mode,
    scope: 'all' as const, createdAt: Date.now(), ackBy: [] as string[],
  })

  const fire = (msg: Omit<Message, 'id'>) => {
    setError(false)
    sendMessage(msg).catch(() => setError(true))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.code} onClick={() => fire({ ...base(), kind: 'alert', presetCode: p.code })}
            className="rounded-lg px-3 py-2 bg-white/10 font-kanit">
            {p.icon} {L(p.labelKey).th}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label={L('comms.message').th}
          className="flex-1 rounded bg-black/40 px-2 py-2 text-white" />
        <button onClick={() => { if (text.trim()) { fire({ ...base(), kind: 'text', text: text.trim() }); setText('') } }}
          className="rounded-lg px-4 py-2 bg-phantom-yellow text-phantom-bg font-kanit">
          {L('comms.send').th}
        </button>
      </div>
      {error && <p role="alert" className="text-red-400 font-kanit text-sm">{L('comms.sendError').th} · {L('comms.sendError').en}</p>}
    </div>
  )
}
