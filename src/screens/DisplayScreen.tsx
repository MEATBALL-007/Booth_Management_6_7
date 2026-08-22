import { useEffect, useState } from 'react'
import type { BoothId, Expense, GlobalConfig, Order } from '../domain/types'
import { subscribeAllOrders, subscribeBoothOrders } from '../order/ordersRepo'
import { subscribeAllExpenses } from '../expense/expensesRepo'
import { subscribeGlobalConfig } from '../domain/configRepo'
import { computeDashboardMetrics } from '../dashboard/metrics'
import { DonationThermometer } from '../donation/DonationThermometer'
import { servingOrders, upNextOrders } from '../display/queueView'
import { useServingAlert } from '../display/useServingAlert'
import { L, nowServingLabel } from '../i18n/labels'
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

  // The thermometer is event-wide, not booth-wide: one goal, one running total,
  // the same number on every screen. That needs its own subscriptions — the
  // queue above deliberately stays scoped to this booth, and is left untouched.
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [config, setConfig] = useState<Partial<GlobalConfig> | null>(null)
  useEffect(() => {
    const unsubOrders = subscribeAllOrders(setAllOrders)
    const unsubExpenses = subscribeAllExpenses(setExpenses)
    const unsubConfig = subscribeGlobalConfig(setConfig)
    return () => { unsubOrders(); unsubExpenses(); unsubConfig() }
  }, [])

  // Reusing the dashboard's formula rather than re-deriving it is the whole
  // point: the customer screen and HQ cannot disagree about the total, because
  // there is only one place the total is computed.
  const { netDonation } = computeDashboardMetrics(allOrders, expenses)

  const serving = servingOrders(orders)
  const upNext = upNextOrders(orders)
  const [next, ...rest] = upNext
  const flashing = useServingAlert(serving.map((s) => ({ n: s.queueNumber, announcedAt: s.announcedAt ?? 0 })), ready)
  const nowServing = nowServingLabel(booth)

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
          🔔 {nowServing.th} · {nowServing.en}
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

      {/* Bottom-LEFT corner, not bottom-right: `App.tsx` already parks the
          back-to-Setup button at `fixed bottom-3 right-3`. `fixed` also takes
          this out of the centred column entirely, which is what "ไม่บังคิว"
          requires — the queue above is laid out exactly as it was before. */}
      <div
        data-testid="donation-corner"
        className="fixed bottom-3 left-3 z-30 w-[min(420px,45vw)] max-w-[calc(100vw-1.5rem)] text-left"
      >
        <DonationThermometer amount={netDonation} target={config?.donationTarget} variant="display" />
      </div>
    </div>
  )
}
