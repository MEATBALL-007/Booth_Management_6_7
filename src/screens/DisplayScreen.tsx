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
  const [next, ...rest] = upNext
  const flashing = useServingAlert(serving.map((s) => ({ n: s.queueNumber, announcedAt: s.announcedAt ?? 0 })), ready)

  return (
    <div
      className={`min-h-screen p-8 md:p-12 flex flex-col items-center justify-center text-center gap-10 md:gap-14 text-phantom-text transition-colors duration-300 ${
        flashing ? 'bg-phantom-orange/30 animate-pulse' : 'bg-phantom-bg'
      }`}
    >
      <header className="w-full flex flex-wrap items-center justify-center gap-4">
        <span className="font-kanit text-3xl md:text-5xl font-bold text-phantom-yellow">
          {L(`booth.${booth}`).th} <span className="text-phantom-muted font-normal">· {L(`booth.${booth}`).en}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0 rounded-full border border-phantom-success/40 bg-phantom-success/10 px-4 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-phantom-success animate-pulse" />
          <span className="font-kanit text-sm md:text-base font-semibold tracking-wide text-phantom-success">{L('display.live').en}</span>
        </span>
      </header>

      <section className="flex flex-col items-center gap-6 md:gap-8">
        <h2 className="font-kanit text-2xl md:text-3xl font-semibold text-phantom-muted">
          🔔 {L('display.nowServing').th} · {L('display.nowServing').en}
        </h2>
        {serving.length === 0 ? (
          <p className="font-kanit text-xl md:text-2xl text-phantom-muted">
            {L('display.noQueue').th} · {L('display.noQueue').en}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
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

      {next && (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-phantom-yellow/50 bg-phantom-yellow/10 px-10 py-6 md:px-16 md:py-8 shadow-[0_0_40px_rgba(255,199,44,0.25)]">
          <h2 className="font-kanit text-xl md:text-2xl font-bold text-phantom-yellow">
            👉 {L('display.next').th} · {L('display.getReady').th}
            <span className="ml-2 text-sm md:text-base font-normal text-phantom-yellow/70">
              {L('display.next').en} · {L('display.getReady').en}
            </span>
          </h2>
          <span
            data-testid="next-up"
            className="glow-y font-mono font-extrabold text-phantom-yellow text-[clamp(56px,10vw,140px)] leading-none"
          >
            {next.queueNumber}
          </span>
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col items-center gap-4 md:gap-5">
          <h2 className="font-kanit text-lg md:text-xl font-semibold text-phantom-muted">
            {L('display.upNext').th} · {L('display.upNext').en}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {rest.map((u) => (
              <div
                key={u.id}
                data-testid="upnext"
                className="rounded-full border border-phantom-line bg-phantom-surface2 px-6 py-3 font-mono text-xl md:text-2xl font-bold text-phantom-muted"
              >
                {u.queueNumber}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
