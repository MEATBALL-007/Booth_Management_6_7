import { useEffect, useState } from 'react'
import type { BoothId, Station, Order } from '../domain/types'
import { subscribeBoothOrders, updateOrderStatus } from '../order/ordersRepo'
import { L } from '../i18n/labels'

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
    <section className="mt-4 border-t border-white/20 pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-kanit">{L('queue.serving').th} ({serving.length}) · {L('queue.waiting').th} ({waiting.length})</span>
        <button onClick={callNext} disabled={waiting.length === 0}
          className="rounded-xl px-4 py-2 bg-phantom-orange font-kanit disabled:opacity-40">
          {L('queue.callNext').th} · {L('queue.callNext').en}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {serving.map((o) => (
          <div key={o.id} className="rounded-lg bg-white/10 px-3 py-2 flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-xl text-phantom-yellow">{o.queueNumber}</span>
              {o.items.length > 0 && <span className="text-xs opacity-70">{itemSummary(o)}</span>}
            </div>
            <button onClick={() => markDone(o.id)} className="text-sm rounded bg-phantom-yellow text-phantom-bg px-2 py-1 font-kanit">{L('queue.done').th}</button>
            <button onClick={() => setCancelId(o.id)} className="text-sm rounded border border-white/30 px-2 py-1 font-kanit">{L('queue.cancel').th}</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {waiting.map((o) => (
          <div key={o.id} className="rounded-lg border border-white/20 px-3 py-2 flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-lg">{o.queueNumber}</span>
              {o.items.length > 0 && <span className="text-xs opacity-70">{itemSummary(o)}</span>}
            </div>
            <button onClick={() => setCancelId(o.id)} className="text-sm rounded border border-white/30 px-2 py-1 font-kanit">{L('queue.cancel').th}</button>
          </div>
        ))}
      </div>

      {cancelId && (
        <div className="rounded-lg bg-white/5 p-3 flex flex-col gap-2">
          <label htmlFor="cancel-reason" className="font-kanit text-sm">{L('queue.reasonPrompt').th} · {L('queue.reasonPrompt').en}</label>
          <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}
            className="rounded bg-black/40 px-2 py-1 text-white" />
          <div className="flex gap-2">
            <button onClick={confirmCancel} className="rounded bg-phantom-orange px-3 py-1 font-kanit">ยืนยันยกเลิก · Confirm cancel</button>
            <button onClick={() => { setCancelId(null); setReason('') }} className="rounded border border-white/30 px-3 py-1 font-kanit">ปิด · Close</button>
          </div>
        </div>
      )}
    </section>
  )
}
