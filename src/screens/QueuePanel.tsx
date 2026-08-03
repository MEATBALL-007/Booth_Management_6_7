import { useEffect, useState } from 'react'
import type { BoothId, Station, Order } from '../domain/types'
import { subscribeBoothOrders, updateOrderStatus } from '../order/ordersRepo'
import { L } from '../i18n/labels'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { QueueNumber } from '../ui/QueueNumber'

export function QueuePanel({ booth, station }: { booth: BoothId; station: Station }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => subscribeBoothOrders(booth, setOrders), [booth])

  const mine = orders.filter((o) => o.station === station)
  const waiting = mine.filter((o) => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const serving = mine.filter((o) => o.status === 'serving')

  const callNext = () => {
    const next = waiting[0]
    if (next) updateOrderStatus(next.id, { status: 'serving', servingAt: Date.now() })
  }
  const markDone = (id: string) => updateOrderStatus(id, { status: 'done', doneAt: Date.now() })
  const itemSummary = (o: Order) =>
    o.items
      .map((item) => {
        const opts = item.options?.length ? ` · ${item.options.map((op) => op.label).join(' · ')}` : ''
        return `${item.name} ×${item.qty}${opts}`
      })
      .join(' , ')
  const confirmCancel = () => {
    if (!cancelId || !reason.trim()) return
    updateOrderStatus(cancelId, { status: 'cancelled', cancelReason: reason.trim() })
    setCancelId(null)
    setReason('')
  }

  return (
    <section className="mt-6 flex flex-col gap-4 border-t border-phantom-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-kanit text-sm text-phantom-muted">
          {L('queue.serving').th} ({serving.length}) · {L('queue.waiting').th} ({waiting.length})
        </span>
        <Button variant="primary" onClick={callNext} disabled={waiting.length === 0} className="min-h-[44px]">
          {L('queue.callNext').th} · {L('queue.callNext').en}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {serving.map((o) => (
          <div
            key={o.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-phantom-yellow/30 bg-phantom-surface2 px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <QueueNumber value={o.queueNumber} size="card" />
              {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => markDone(o.id)} className="min-h-[44px]">
                {L('queue.done').th}
              </Button>
              <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">
                {L('queue.cancel').th}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {waiting.map((o) => (
          <div
            key={o.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-phantom-line bg-phantom-surface px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <span className="font-mono text-2xl font-bold text-phantom-text">{o.queueNumber}</span>
              {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            </div>
            <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">
              {L('queue.cancel').th}
            </Button>
          </div>
        ))}
      </div>

      {cancelId && (
        <Panel className="flex flex-col gap-3 border-phantom-orange/40">
          <label htmlFor="cancel-reason" className="font-kanit text-sm text-phantom-muted">
            {L('queue.reasonPrompt').th} · {L('queue.reasonPrompt').en}
          </label>
          <input
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-bg px-3 py-2 font-kanit text-phantom-text"
          />
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmCancel} className="min-h-[44px] flex-1">
              ยืนยันยกเลิก · Confirm cancel
            </Button>
            <Button variant="ghost" onClick={() => { setCancelId(null); setReason('') }} className="min-h-[44px] flex-1">
              ปิด · Close
            </Button>
          </div>
        </Panel>
      )}
    </section>
  )
}
