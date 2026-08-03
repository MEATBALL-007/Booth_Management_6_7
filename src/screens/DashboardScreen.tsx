import { useEffect, useState } from 'react'
import type { Order, Expense, BoothId } from '../domain/types'
import { BOOTH_IDS } from '../domain/types'
import { subscribeAllOrders } from '../order/ordersRepo'
import { subscribeAllExpenses, addExpense } from '../expense/expensesRepo'
import { computeDashboardMetrics } from '../dashboard/metrics'
import { isDashboardUnlocked } from '../dashboard/pinStore'
import { PinGate } from '../dashboard/PinGate'
import { L } from '../i18n/labels'
import { CommsToast } from '../comms/CommsToast'
import { PresenceBoard } from '../comms/PresenceBoard'
import { BroadcastBar } from '../comms/BroadcastBar'
import { useHeartbeat } from '../comms/useHeartbeat'
import { getDeviceId } from '../device/deviceId'
import { loadDeviceConfig } from '../device/deviceConfig'

function Card({ testid, labelTh, labelEn, value }: { testid: string; labelTh: string; labelEn: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 p-4 flex flex-col gap-1">
      <span className="font-kanit text-sm opacity-70">{labelTh} · {labelEn}</span>
      <span data-testid={testid} className="font-mono text-3xl text-phantom-orange">{value}</span>
    </div>
  )
}

export function DashboardScreen() {
  const [unlocked, setUnlocked] = useState(() => isDashboardUnlocked())
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [booth, setBooth] = useState<BoothId>('photo')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hqBooth = loadDeviceConfig()?.booth ?? 'photo'

  useHeartbeat(unlocked ? { id: getDeviceId(), deviceId: getDeviceId(), booth: hqBooth, mode: 'dashboard' } : null)

  useEffect(() => {
    if (!unlocked) return
    const u1 = subscribeAllOrders(setOrders)
    const u2 = subscribeAllExpenses(setExpenses)
    return () => { u1(); u2() }
  }, [unlocked])

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  const m = computeDashboardMetrics(orders, expenses)

  const saveExpense = () => {
    const value = Number(amount)
    if (!desc.trim() || !Number.isFinite(value) || value <= 0) return
    const payload = { boothId: booth, description: desc.trim(), amount: value, createdAt: Date.now() }
    setError(null)
    addExpense(payload).catch(() => setError(payload.description))
    setDesc('')
    setAmount('')
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6">
      <CommsToast booth={hqBooth} />
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('dashboard.title').th} · {L('dashboard.title').en}
      </h1>

      <section className="rounded-xl bg-white/5 p-4 flex flex-col gap-4">
        <h2 className="font-kanit text-lg text-phantom-yellow">HQ</h2>
        <PresenceBoard />
        <BroadcastBar booth={hqBooth} />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card testid="total-sales" labelTh={L('dashboard.totalSales').th} labelEn={L('dashboard.totalSales').en} value={`${m.totalSales}฿`} />
        <Card testid="net-donation" labelTh={L('dashboard.netDonation').th} labelEn={L('dashboard.netDonation').en} value={`${m.netDonation}฿`} />
        <Card testid="cash-total" labelTh={L('dashboard.cash').th} labelEn={L('dashboard.cash').en} value={`${m.cashTotal}฿`} />
        <Card testid="qr-total" labelTh={L('dashboard.qr').th} labelEn={L('dashboard.qr').en} value={`${m.qrTotal}฿`} />
        <Card testid="total-cost" labelTh={L('dashboard.totalCost').th} labelEn={L('dashboard.totalCost').en} value={`${m.totalCost}฿`} />
        <Card testid="expected-cash" labelTh={L('dashboard.expectedCash').th} labelEn={L('dashboard.expectedCash').en} value={`${m.expectedCash}฿`} />
        <Card testid="paid-orders" labelTh={L('dashboard.orders').th} labelEn={L('dashboard.orders').en} value={`${m.paidOrderCount}`} />
        <Card testid="done-count" labelTh={L('dashboard.done').th} labelEn={L('dashboard.done').en} value={`${m.doneCount}`} />
      </section>

      <section>
        <h2 className="font-kanit opacity-80 mb-2">{L('dashboard.byBooth').th} · {L('dashboard.byBooth').en}</h2>
        <div className="flex flex-wrap gap-4">
          {BOOTH_IDS.map((b) => (
            <div key={b} className="font-mono">
              {L(`booth.${b}`).th}: <span className="text-phantom-yellow">{m.byBooth[b]}฿</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-kanit opacity-80 mb-2">{L('dashboard.bestSellers').th} · {L('dashboard.bestSellers').en}</h2>
        <ul className="flex flex-col gap-1">
          {m.bestSellers.map((s) => (
            <li key={s.sku} className="font-mono">{s.name} × {s.qty} = {s.sales}฿</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white/5 p-4 flex flex-col gap-3 max-w-md">
        <h2 className="font-kanit">{L('dashboard.addExpense').th} · {L('dashboard.addExpense').en}</h2>
        {error && (
          <p role="alert" className="text-red-400 font-kanit">
            {L('dashboard.expenseError').th} · {L('dashboard.expenseError').en}: {error}
          </p>
        )}
        <select value={booth} onChange={(e) => setBooth(e.target.value as BoothId)} aria-label={L('dashboard.byBooth').th}
          className="rounded bg-black/40 px-2 py-2 text-white font-kanit">
          {BOOTH_IDS.map((b) => <option key={b} value={b}>{L(`booth.${b}`).th}</option>)}
        </select>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label={L('dashboard.expenseDesc').th}
          className="rounded bg-black/40 px-2 py-2 text-white" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label={L('dashboard.expenseAmount').th}
          className="rounded bg-black/40 px-2 py-2 text-white font-mono" />
        <button onClick={saveExpense} className="rounded-lg px-4 py-2 bg-phantom-yellow text-phantom-bg font-kanit">
          {L('dashboard.save').th} · {L('dashboard.save').en}
        </button>
      </section>
    </div>
  )
}
