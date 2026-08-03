import { useState } from 'react'
import type { BoothId, Mode } from '../domain/types'
import type { PresetCode, Message } from './types'
import { sendMessage } from './commsRepo'
import { getDeviceId } from '../device/deviceId'
import { L } from '../i18n/labels'
import { Button } from '../ui/Button'

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.code}
            onClick={() => fire({ ...base(), kind: 'alert', presetCode: p.code })}
            className="min-h-[44px] rounded-full border border-phantom-line bg-phantom-surface2 px-4 py-2 font-kanit font-semibold text-phantom-text transition hover:border-phantom-yellow/50 hover:bg-phantom-surface"
          >
            {p.icon} {L(p.labelKey).th}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={L('comms.message').th}
          placeholder={L('comms.message').th}
          className="min-h-[44px] flex-1 rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 text-phantom-text focus:border-phantom-yellow/60 focus:outline-none"
        />
        <Button
          variant="primary"
          onClick={() => { if (text.trim()) { fire({ ...base(), kind: 'text', text: text.trim() }); setText('') } }}
          className="min-h-[44px] px-5"
        >
          {L('comms.send').th}
        </Button>
      </div>
      {error && <p role="alert" className="font-kanit text-sm text-phantom-orange">{L('comms.sendError').th} · {L('comms.sendError').en}</p>}
    </div>
  )
}
