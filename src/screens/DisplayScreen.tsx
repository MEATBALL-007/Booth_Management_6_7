import { useEffect, useState } from 'react'
import type { BoothId, Order } from '../domain/types'
import { subscribeBoothOrders } from '../order/ordersRepo'
import { servingOrders, upNextOrders } from '../display/queueView'
import { useServingAlert } from '../display/useServingAlert'
import { L } from '../i18n/labels'
import { QueueNumber } from '../ui/QueueNumber'

function itemDetail(o: Order): string {
  return o.items
    .map((item) => {
      const opts = item.options?.length ? ` (${item.options.map((op) => op.label).join(', ')})` : ''
      return `${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''}${opts}`
    })
    .join(' · ')
}

export function DisplayScreen({ booth }: { booth: BoothId }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => subscribeBoothOrders(booth, (o) => { setOrders(o); setReady(true) }), [booth])

  const serving = servingOrders(orders)
  const upNext = upNextOrders(orders)
  const flashing = useServingAlert(serving.map((s) => s.queueNumber), ready)

  return (
    <div
      className={`min-h-screen p-8 md:p-12 flex flex-col gap-10 md:gap-14 text-phantom-text transition-colors duration-300 ${
        flashing ? 'bg-phantom-orange/30 animate-pulse' : 'bg-phantom-bg'
      }`}
    >
      <header className="flex items-center justify-between gap-4">
        <span className="font-kanit text-3xl md:text-5xl font-bold text-phantom-yellow">
          {L(`booth.${booth}`).th} <span className="text-phantom-muted font-normal">· {L(`booth.${booth}`).en}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0 rounded-full border border-phantom-success/40 bg-phantom-success/10 px-4 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-phantom-success animate-pulse" />
          <span className="font-kanit text-sm md:text-base font-semibold tracking-wide text-phantom-success">LIVE</span>
        </span>
      </header>

      <section className="flex flex-col gap-6 md:gap-8">
        <h2 className="font-kanit text-2xl md:text-3xl font-semibold text-phantom-muted">
          {L('display.nowServing').th} · {L('display.nowServing').en}
        </h2>
        {serving.length === 0 ? (
          <p className="font-kanit text-xl md:text-2xl text-phantom-muted">
            {L('display.noQueue').th} · {L('display.noQueue').en}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-10 md:gap-16">
            {serving.map((s) => {
              const detail = itemDetail(s)
              return (
                <div key={s.id} className="flex flex-col items-center gap-3 text-center max-w-full">
                  <span data-testid="serving">
                    <QueueNumber value={s.queueNumber} size="display" />
                  </span>
                  {detail && (
                    <span className="font-kanit text-lg md:text-2xl text-phantom-text/80 max-w-[90vw] break-words">
                      {detail}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 md:gap-5">
        <h2 className="font-kanit text-xl md:text-2xl font-semibold text-phantom-muted">
          {L('display.upNext').th} · {L('display.upNext').en}
        </h2>
        <div className="flex flex-wrap gap-4">
          {upNext.map((u) => (
            <div
              key={u.id}
              data-testid="upnext"
              className="rounded-full border border-phantom-line bg-phantom-surface2 px-6 py-3 font-mono text-2xl md:text-3xl font-bold text-phantom-text"
            >
              {u.queueNumber}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
