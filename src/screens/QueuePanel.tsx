import { useEffect, useRef, useState } from 'react'
import type { BoothId, Station, Order } from '../domain/types'
import { subscribeBoothOrders, updateOrderStatus } from '../order/ordersRepo'
import * as Q from '../queue/queueActions'
import { L } from '../i18n/labels'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { QueueNumber } from '../ui/QueueNumber'

export function QueuePanel({ booth, station }: { booth: BoothId; station: Station }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [undo, setUndo] = useState<{ id: string; before: Q.OrderSnapshot; label: string } | null>(null)

  /**
   * Ids whose status-transition write has been sent but is not yet reflected in
   * a snapshot. The guards in `queueActions` test the order object the panel
   * hands them, and that object only changes when a snapshot arrives — so two
   * presses inside one render generation both see the OLD status and both write.
   * A pure action handed one order has no memory and cannot refuse a repeat, so
   * this write-once half of the guard has to live here.
   */
  const moved = useRef(new Set<string>())

  useEffect(() => subscribeBoothOrders(booth, (next) => {
    // A snapshot is this panel's only source of truth; once one lands every
    // closure is fresh and the action guards can be trusted again. Clearing the
    // whole set — rather than only the ids we can see changed — is deliberate: a
    // write that never comes back would otherwise latch a button shut forever,
    // and a permanently dead button is far worse at a live booth than one extra
    // write in a race we already lost.
    moved.current.clear()
    setOrders(next)
  }), [booth])

  const mine = orders.filter((o) => o.station === station)
  const waiting = mine.filter((o) => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const serving = mine.filter((o) => o.status === 'serving')
  const skipped = mine.filter((o) => o.status === 'skipped')

  // apply a patch to one order, recording an undo snapshot first
  const apply = (order: Order, patch: Partial<Order> | null, label: string) => {
    if (!patch) return
    // Only status transitions are held to once-per-snapshot. ประกาศซ้ำ moves no
    // status — "serving (ไม่เปลี่ยนสถานะ)" in the spec's action table — and is
    // meant to be pressed again and again, so it must not be caught here.
    if (patch.status !== undefined) {
      if (moved.current.has(order.id)) return
      moved.current.add(order.id)
    }
    setUndo({ id: order.id, before: Q.orderSnapshot(order), label })
    updateOrderStatus(order.id, patch)
  }

  const doCallNext = () => {
    const r = Q.callNext(mine, station, Date.now())
    if (!r) return
    const target = mine.find((o) => o.id === r.id)!
    apply(target, r.patch, L('queue.callNext').th)
  }
  // Undo reverses the very transition `moved` is holding, so the hold is void:
  // release the id here too, or an undo with no snapshot behind it would leave
  // the order unable to move again.
  const runUndo = () => { if (undo) { moved.current.delete(undo.id); updateOrderStatus(undo.id, undo.before); setUndo(null) } }
  const confirmCancel = () => {
    if (!cancelId || !reason.trim()) return
    const order = mine.find((o) => o.id === cancelId)
    if (order) apply(order, Q.cancel(reason), L('queue.cancel').th)
    setCancelId(null); setReason('')
  }
  const itemSummary = (o: Order) => o.items.map((it) => `${it.name} ×${it.qty}${it.options?.length ? ` · ${it.options.map((op) => op.label).join(' · ')}` : ''}`).join(' , ')

  return (
    <section className="mt-6 flex flex-col gap-4 border-t border-phantom-line pt-6">
      {/* header + Call next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-kanit text-sm text-phantom-muted">
          {L('queue.serving').th} ({serving.length}) · {L('queue.waiting').th} ({waiting.length})
        </span>
        <Button variant="primary" onClick={doCallNext} disabled={waiting.length === 0} className="min-h-[44px]">
          {L('queue.callNext').th} · {L('queue.callNext').en}
        </Button>
      </div>

      {/* undo bar */}
      {undo && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-phantom-line bg-phantom-surface2 px-4 py-2">
          <span className="font-kanit text-sm text-phantom-muted">↩︎ {undo.label}</span>
          <Button variant="ghost" onClick={runUndo} className="min-h-[44px]">{L('queue.undo').th} · {L('queue.undo').en}</Button>
        </div>
      )}

      {/* serving cards: เสร็จ / ข้าม / ประกาศซ้ำ / ยกเลิก */}
      <div className="flex flex-wrap gap-3">
        {serving.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-2xl border border-phantom-yellow/30 bg-phantom-surface2 px-4 py-3">
            <QueueNumber value={o.queueNumber} size="card" />
            {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => apply(o, Q.markDone(o, Date.now()), L('queue.done').th)} className="min-h-[44px]">{L('queue.done').th}</Button>
              <Button variant="ghost" onClick={() => apply(o, Q.skip(o), L('queue.skip').th)} className="min-h-[44px]">{L('queue.skip').th}</Button>
              <Button variant="ghost" onClick={() => apply(o, Q.reannounce(o, Date.now()), L('queue.reannounce').th)} className="min-h-[44px]">🔔 {L('queue.reannounce').th}</Button>
              <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">{L('queue.cancel').th}</Button>
            </div>
          </div>
        ))}
      </div>

      {/* waiting cards: เรียก (specific) + ยกเลิก */}
      <div className="flex flex-wrap gap-3">
        {waiting.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-2xl border border-phantom-line bg-phantom-surface px-4 py-3">
            <span className="font-mono text-2xl font-bold text-phantom-text">{o.queueNumber}</span>
            {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => apply(o, Q.callSpecific(o, Date.now()), L('queue.callSpecific').th)} className="min-h-[44px]">{L('queue.callSpecific').th}</Button>
              <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">{L('queue.cancel').th}</Button>
            </div>
          </div>
        ))}
      </div>

      {/* skipped (พักไว้) zone: เรียกซ้ำ */}
      {skipped.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-kanit text-sm text-phantom-muted">{L('queue.parked').th} · {L('queue.parked').en} ({skipped.length})</span>
          <div className="flex flex-wrap gap-3">
            {skipped.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-phantom-line bg-phantom-surface px-4 py-3">
                <span className="font-mono text-2xl font-bold text-phantom-muted">{o.queueNumber}</span>
                <Button variant="primary" onClick={() => apply(o, Q.recall(o, Date.now()), L('queue.recall').th)} className="min-h-[44px]">{L('queue.recall').th}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* cancel-reason panel (unchanged text) */}
      {cancelId && (
        <Panel className="flex flex-col gap-3 border-phantom-orange/40">
          <label htmlFor="cancel-reason" className="font-kanit text-sm text-phantom-muted">{L('queue.reasonPrompt').th} · {L('queue.reasonPrompt').en}</label>
          <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-bg px-3 py-2 font-kanit text-phantom-text" />
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmCancel} className="min-h-[44px] flex-1">ยืนยันยกเลิก · Confirm cancel</Button>
            <Button variant="ghost" onClick={() => { setCancelId(null); setReason('') }} className="min-h-[44px] flex-1">ปิด · Close</Button>
          </div>
        </Panel>
      )}
    </section>
  )
}
