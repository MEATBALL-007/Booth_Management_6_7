import { useEffect, useState } from 'react'
import type { BoothId } from '../domain/types'
import type { Message, PresetCode } from './types'
import { subscribeMessages, ackMessage } from './commsRepo'
import { getDeviceId } from '../device/deviceId'
import { visibleMessages } from './commsLogic'
import { L } from '../i18n/labels'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

const PRESET_LABEL: Record<PresetCode, 'comms.needHelp' | 'comms.lowStock' | 'comms.cleared'> = {
  need_help: 'comms.needHelp',
  low_stock: 'comms.lowStock',
  cleared: 'comms.cleared',
}

function body(msg: Message): string {
  if (msg.kind === 'broadcast') return `${L('comms.broadcast').th}: ${msg.text ?? ''}`
  if (msg.kind === 'alert' && msg.presetCode) return L(PRESET_LABEL[msg.presetCode]).th
  return msg.text ?? ''
}

export function CommsToast({ booth }: { booth: BoothId }) {
  const [messages, setMessages] = useState<Message[]>([])
  const me = getDeviceId()

  useEffect(() => subscribeMessages(setMessages), [])

  const top = visibleMessages(messages, booth, me)[0]
  if (!top) return null

  return (
    <Panel
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 border-phantom-yellow/40 py-3 shadow-lg"
    >
      <span className="font-kanit text-phantom-text">
        <span className="text-phantom-yellow">{L(`booth.${top.fromBooth}`).th}</span> · {body(top)}
      </span>
      <Button variant="ghost" onClick={() => ackMessage(top.id, me)} className="min-h-[44px] px-4 py-2 text-sm">
        {L('comms.ack').th}
      </Button>
    </Panel>
  )
}
