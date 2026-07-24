import { useEffect, useState } from 'react'
import type { BoothId, Order } from '../domain/types'
import { subscribeBoothOrders } from '../order/ordersRepo'
import { servingOrders, upNextOrders } from '../display/queueView'
import { useServingAlert } from '../display/useServingAlert'
import { L } from '../i18n/labels'

export function DisplayScreen({ booth }: { booth: BoothId }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => subscribeBoothOrders(booth, (o) => { setOrders(o); setReady(true) }), [booth])

  const serving = servingOrders(orders)
  const upNext = upNextOrders(orders)
  const flashing = useServingAlert(serving.map((s) => s.queueNumber), ready)

  return (
    <div
      className={`min-h-screen p-8 flex flex-col gap-10 transition-colors ${
        flashing ? 'bg-phantom-orange/30 animate-pulse' : 'bg-phantom-bg'
      }`}
    >
      <header className="flex items-center justify-between">
        <span className="font-kanit text-3xl text-phantom-yellow">
          {L(`booth.${booth}`).th} · {L(`booth.${booth}`).en}
        </span>
      </header>

      <section>
        <h2 className="font-kanit text-2xl opacity-80 mb-4">
          {L('display.nowServing').th} · {L('display.nowServing').en}
        </h2>
        {serving.length === 0 ? (
          <p className="font-kanit text-xl opacity-50">
            {L('display.noQueue').th} · {L('display.noQueue').en}
          </p>
        ) : (
          <div className="flex flex-wrap gap-8">
            {serving.map((s) => (
              <div key={s.id} data-testid="serving" className="font-mono text-8xl text-phantom-orange">
                {s.queueNumber}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-kanit text-2xl opacity-80 mb-4">
          {L('display.upNext').th} · {L('display.upNext').en}
        </h2>
        <div className="flex flex-wrap gap-5">
          {upNext.map((u) => (
            <div key={u.id} data-testid="upnext" className="font-mono text-5xl opacity-80">
              {u.queueNumber}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
