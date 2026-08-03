import { useState } from 'react'
import type { BoothId, Station, Selections } from '../domain/types'
import { productsForBooth } from '../domain/catalog'
import { addToCart, setQty, cartTotal, cartToOrderItems, lineKey, type Cart } from '../order/cart'
import { defaultSelections, lineUnitPrice, selectedOptionLabels } from '../order/options'
import { nextQueueNumber } from '../order/queueNumber'
import { buildOrder } from '../order/buildOrder'
import { createOrder } from '../order/ordersRepo'
import { buildPromptPayPayload } from '../order/promptpay'
import { QrCode } from '../order/QrCode'
import { QueuePanel } from './QueuePanel'
import { APP_CONFIG } from '../domain/appConfig'
import { L } from '../i18n/labels'
import { AlertButtons } from '../comms/AlertButtons'
import { CommsToast } from '../comms/CommsToast'
import { useHeartbeat } from '../comms/useHeartbeat'
import { getDeviceId } from '../device/deviceId'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Chip } from '../ui/Chip'
import { QueueNumber } from '../ui/QueueNumber'

type Pay = 'none' | 'cash' | 'qr'

export function OrderStation({ booth, station }: { booth: BoothId; station: Station }) {
  const products = productsForBooth(booth)
  const [cart, setCart] = useState<Cart>([])
  const [pay, setPay] = useState<Pay>('none')
  const [issued, setIssued] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [pick, setPick] = useState<Selections>({})

  useHeartbeat({ id: getDeviceId(), deviceId: getDeviceId(), booth, mode: 'order', station })

  const total = cartTotal(cart, products)

  const onProductTap = (p: (typeof products)[number]) => {
    setIssued(null)
    if (p.optionGroups && p.optionGroups.length > 0) {
      setPicking(p.sku)
      setPick(defaultSelections(p))
    } else {
      setCart((c) => addToCart(c, p.sku, {}))
    }
  }

  const confirmPick = () => {
    if (!picking) return
    setCart((c) => addToCart(c, picking, pick))
    setPicking(null)
    setPick({})
  }

  const pickingProduct = picking ? products.find((p) => p.sku === picking) : undefined

  const finalize = (method: 'cash' | 'qr') => {
    const queueNumber = nextQueueNumber(booth, station)
    const order = buildOrder({
      boothId: booth, station, queueNumber,
      items: cartToOrderItems(cart, products), paymentMethod: method, now: Date.now(),
    })
    setIssued(queueNumber)
    setCart([])
    setPay('none')
    setError(null)
    createOrder(order).catch(() => setError(queueNumber))
  }

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-4 text-phantom-text">
      <CommsToast booth={booth} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-kanit text-2xl text-phantom-yellow">{L(`booth.${booth}`).th}</span>
          <span className="font-kanit text-sm text-phantom-muted">{L(`booth.${booth}`).en}</span>
        </div>
        <Chip tone="cash">STATION {station}</Chip>
      </header>

      {issued && (
        <div
          data-testid="issued-queue"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-phantom-yellow/40 bg-phantom-surface2 px-6 py-4"
        >
          <span className="font-kanit text-sm text-phantom-muted">คิวที่ออก · Queue issued</span>
          <QueueNumber value={issued} size="card" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-600/80 px-3 py-2 font-kanit">
          บันทึกออเดอร์ {error} ไม่สำเร็จ · Failed to save order {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {products.map((p) => (
            <button
              key={p.sku}
              onClick={() => onProductTap(p)}
              className="flex min-h-[44px] flex-col gap-2 rounded-2xl border border-phantom-line bg-phantom-surface p-4 text-left transition-transform hover:-translate-y-0.5 hover:border-phantom-orange/40"
            >
              {p.optionGroups && p.optionGroups.length > 0 && (
                <Chip tone="neutral" className="self-start text-xs">มีตัวเลือก</Chip>
              )}
              <div className="font-kanit">{p.name}</div>
              <div className="text-xs text-phantom-muted">{p.nameEn}</div>
              <div className="mt-auto font-mono text-lg text-phantom-orange">{p.price}฿</div>
            </button>
          ))}
        </section>

        <Panel className="flex flex-col gap-3">
          <h2 className="font-kanit text-sm uppercase tracking-wide text-phantom-muted">ตะกร้า · Cart</h2>

          <div className="flex flex-col gap-2">
            {cart.length === 0 && (
              <p className="font-kanit text-sm text-phantom-muted">ยังไม่มีรายการ · No items yet</p>
            )}
            {cart.map((line) => {
              const p = products.find((x) => x.sku === line.sku)!
              const key = lineKey(line.sku, line.selections)
              const optionLabels = selectedOptionLabels(p, line.selections)
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl border border-phantom-line bg-phantom-surface2 p-3">
                  <div className="flex flex-1 flex-col">
                    <span className="font-kanit">{p.name}</span>
                    {optionLabels.length > 0 && (
                      <span className="font-kanit text-xs text-phantom-yellow">
                        {optionLabels.map((o) => o.label).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCart((c) => setQty(c, key, line.qty - 1))}
                      className="min-h-[44px] min-w-[44px] rounded-lg border border-phantom-line bg-phantom-surface font-mono text-lg"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono">{line.qty}</span>
                    <button
                      onClick={() => setCart((c) => setQty(c, key, line.qty + 1))}
                      className="min-h-[44px] min-w-[44px] rounded-lg border border-phantom-line bg-phantom-surface font-mono text-lg"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 text-right font-mono">{lineUnitPrice(p, line.selections) * line.qty}฿</span>
                </div>
              )
            })}
          </div>

          <div className="flex items-baseline justify-between border-t border-phantom-line pt-3">
            <span className="font-kanit text-phantom-muted">{L('order.total').th} · {L('order.total').en}</span>
            <span data-testid="cart-total" className="glow-y font-mono text-3xl font-extrabold text-phantom-yellow">
              {total}฿
            </span>
          </div>

          {cart.length > 0 && pay === 'none' && (
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setPay('cash')} className="min-h-[44px] flex-1">
                💵 {L('order.cash').th} · {L('order.cash').en}
              </Button>
              <Button variant="ghost" onClick={() => setPay('qr')} className="min-h-[44px] flex-1">
                📷 {L('order.qr').th} · {L('order.qr').en}
              </Button>
            </div>
          )}

          {pay === 'cash' && (
            <Button variant="primary" onClick={() => finalize('cash')} className="min-h-[44px] w-full text-lg">
              💵 {L('order.cashConfirm').th} · {L('order.cashConfirm').en}
            </Button>
          )}

          {pay === 'qr' && (
            <div className="flex flex-col items-center gap-3">
              <QrCode payload={buildPromptPayPayload(APP_CONFIG.promptpayId, total)} />
              <Button variant="primary" onClick={() => finalize('qr')} className="min-h-[44px] w-full text-lg">
                ✅ {L('order.qrConfirm').th} · {L('order.qrConfirm').en}
              </Button>
            </div>
          )}
        </Panel>
      </div>

      {pickingProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <Panel className="flex w-full max-w-lg flex-col gap-3 border-phantom-yellow/50">
            <span className="font-kanit text-phantom-yellow">
              {L('order.chooseOptions').th} · {L('order.chooseOptions').en} — {pickingProduct.name}
            </span>
            {(pickingProduct.optionGroups ?? []).map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <span className="font-kanit text-xs text-phantom-muted">{group.name} · {group.nameEn}</span>
                <div className="flex flex-wrap gap-2">
                  {group.choices.map((choice) => {
                    const active = pick[group.id] === choice.id
                    return (
                      <button
                        key={choice.id}
                        onClick={() => setPick((s) => ({ ...s, [group.id]: choice.id }))}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 font-kanit transition-colors ${
                          active
                            ? 'border-phantom-orange bg-phantom-orange/15 text-phantom-text'
                            : 'border-phantom-line bg-phantom-surface2 text-phantom-text hover:border-phantom-orange/40'
                        }`}
                      >
                        {choice.name}
                        {choice.priceDelta !== 0 ? ` (+${choice.priceDelta}฿)` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="primary" onClick={confirmPick} className="min-h-[44px] flex-1">
                {L('order.add').th} · {L('order.add').en}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setPicking(null); setPick({}) }}
                className="min-h-[44px] flex-1"
              >
                {L('order.cancelPick').th} · {L('order.cancelPick').en}
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <footer className="border-t border-phantom-line pt-4">
        <AlertButtons booth={booth} mode="order" />
      </footer>

      <QueuePanel booth={booth} station={station} />
    </div>
  )
}
