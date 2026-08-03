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
    <div className="min-h-screen p-4 flex flex-col gap-4">
      <CommsToast booth={booth} />
      <header className="flex items-center justify-between">
        <span className="font-kanit text-phantom-yellow">
          {L(`booth.${booth}`).th} · {L(`booth.${booth}`).en} · station {station}
        </span>
        {issued && (
          <span data-testid="issued-queue" className="font-mono text-4xl text-phantom-orange">
            {issued}
          </span>
        )}
      </header>

      {error && (
        <div role="alert" className="rounded-lg bg-red-600/80 px-3 py-2 font-kanit">
          บันทึกออเดอร์ {error} ไม่สำเร็จ · Failed to save order {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <button
            key={p.sku}
            onClick={() => onProductTap(p)}
            className="rounded-xl border-2 border-white/20 p-4 text-left font-kanit"
          >
            <div>{p.name}</div>
            <div className="text-xs opacity-70">{p.nameEn}</div>
            <div className="font-mono text-phantom-yellow">{p.price}฿</div>
          </button>
        ))}
      </section>

      {pickingProduct && (
        <section className="flex flex-col gap-3 rounded-xl border-2 border-phantom-yellow/50 p-4">
          <span className="font-kanit text-phantom-yellow">
            {L('order.chooseOptions').th} · {L('order.chooseOptions').en} — {pickingProduct.name}
          </span>
          {(pickingProduct.optionGroups ?? []).map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <span className="text-xs opacity-70 font-kanit">{group.name} · {group.nameEn}</span>
              <div className="flex flex-wrap gap-2">
                {group.choices.map((choice) => {
                  const active = pick[group.id] === choice.id
                  return (
                    <button
                      key={choice.id}
                      onClick={() => setPick((s) => ({ ...s, [group.id]: choice.id }))}
                      className={`rounded-lg px-3 py-2 font-kanit ${active ? 'bg-phantom-yellow text-phantom-bg' : 'bg-white/10'}`}
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
            <button onClick={confirmPick} className="flex-1 rounded-xl py-3 bg-phantom-yellow text-phantom-bg font-kanit">
              {L('order.add').th}
            </button>
            <button onClick={() => { setPicking(null); setPick({}) }} className="flex-1 rounded-xl py-3 bg-white/10 font-kanit">
              {L('order.cancelPick').th}
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        {cart.map((line) => {
          const p = products.find((x) => x.sku === line.sku)!
          const key = lineKey(line.sku, line.selections)
          const optionLabels = selectedOptionLabels(p, line.selections)
          const displayName = optionLabels.length > 0
            ? `${p.name} · ${optionLabels.map((o) => o.label).join(' · ')}`
            : p.name
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex-1 font-kanit">{displayName}</span>
              <button onClick={() => setCart((c) => setQty(c, key, line.qty - 1))} className="px-3 rounded bg-white/10">−</button>
              <span className="font-mono w-6 text-center">{line.qty}</span>
              <button onClick={() => setCart((c) => setQty(c, key, line.qty + 1))} className="px-3 rounded bg-white/10">+</button>
              <span className="font-mono w-16 text-right">{lineUnitPrice(p, line.selections) * line.qty}฿</span>
            </div>
          )
        })}
        <div className="flex justify-between border-t border-white/20 pt-2">
          <span className="font-kanit">{L('order.total').th} · {L('order.total').en}</span>
          <span data-testid="cart-total" className="font-mono text-2xl text-phantom-orange">{total}฿</span>
        </div>
      </section>

      {cart.length > 0 && pay === 'none' && (
        <div className="flex gap-3">
          <button onClick={() => setPay('cash')} className="flex-1 rounded-xl py-3 bg-white/10 font-kanit">
            {L('order.cash').th} · {L('order.cash').en}
          </button>
          <button onClick={() => setPay('qr')} className="flex-1 rounded-xl py-3 bg-white/10 font-kanit">
            {L('order.qr').th} · {L('order.qr').en}
          </button>
        </div>
      )}

      {pay === 'cash' && (
        <button onClick={() => finalize('cash')} className="rounded-xl py-4 bg-phantom-yellow text-phantom-bg font-kanit text-lg">
          {L('order.cashConfirm').th} · {L('order.cashConfirm').en}
        </button>
      )}

      {pay === 'qr' && (
        <div className="flex flex-col items-center gap-3">
          <QrCode payload={buildPromptPayPayload(APP_CONFIG.promptpayId, total)} />
          <button onClick={() => finalize('qr')} className="rounded-xl py-4 px-6 bg-phantom-yellow text-phantom-bg font-kanit text-lg">
            {L('order.qrConfirm').th} · {L('order.qrConfirm').en}
          </button>
        </div>
      )}

      <footer className="border-t border-white/20 pt-4">
        <AlertButtons booth={booth} mode="order" />
      </footer>

      <QueuePanel booth={booth} station={station} />
    </div>
  )
}
