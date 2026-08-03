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
import { StatTile } from '../ui/StatTile'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

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
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 text-phantom-text">
      <CommsToast booth={hqBooth} />
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('dashboard.title').th} · {L('dashboard.title').en}
      </h1>

      <Panel className="flex flex-col gap-4">
        <h2 className="font-kanit text-lg text-phantom-yellow">HQ</h2>
        <PresenceBoard />
        <BroadcastBar booth={hqBooth} />
      </Panel>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile testid="total-sales" label={`${L('dashboard.totalSales').th} · ${L('dashboard.totalSales').en}`} value={`${m.totalSales}฿`} />
        <StatTile testid="net-donation" label={`${L('dashboard.netDonation').th} · ${L('dashboard.netDonation').en}`} value={`${m.netDonation}฿`} accent />
        <StatTile testid="cash-total" label={`${L('dashboard.cash').th} · ${L('dashboard.cash').en}`} value={`${m.cashTotal}฿`} />
        <StatTile testid="qr-total" label={`${L('dashboard.qr').th} · ${L('dashboard.qr').en}`} value={`${m.qrTotal}฿`} />
        <StatTile testid="total-cost" label={`${L('dashboard.totalCost').th} · ${L('dashboard.totalCost').en}`} value={`${m.totalCost}฿`} />
        <StatTile testid="expected-cash" label={`${L('dashboard.expectedCash').th} · ${L('dashboard.expectedCash').en}`} value={`${m.expectedCash}฿`} />
        <StatTile testid="paid-orders" label={`${L('dashboard.orders').th} · ${L('dashboard.orders').en}`} value={`${m.paidOrderCount}`} />
        <StatTile testid="done-count" label={`${L('dashboard.done').th} · ${L('dashboard.done').en}`} value={`${m.doneCount}`} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <h2 className="font-kanit text-sm uppercase tracking-wide text-phantom-muted mb-3">
            {L('dashboard.byBooth').th} · {L('dashboard.byBooth').en}
          </h2>
          <div className="flex flex-wrap gap-4">
            {BOOTH_IDS.map((b) => (
              <div key={b} className="font-mono">
                {L(`booth.${b}`).th}: <span className="text-phantom-yellow">{m.byBooth[b]}฿</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-kanit text-sm uppercase tracking-wide text-phantom-muted mb-3">
            {L('dashboard.bestSellers').th} · {L('dashboard.bestSellers').en}
          </h2>
          <ul className="flex flex-col gap-1">
            {m.bestSellers.map((s) => (
              <li key={s.sku} className="font-mono text-sm">{s.name} × {s.qty} = {s.sales}฿</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="flex flex-col gap-3 max-w-md">
        <h2 className="font-kanit">{L('dashboard.addExpense').th} · {L('dashboard.addExpense').en}</h2>
        {error && (
          <p role="alert" className="text-phantom-danger font-kanit">
            {L('dashboard.expenseError').th} · {L('dashboard.expenseError').en}: {error}
          </p>
        )}
        <select value={booth} onChange={(e) => setBooth(e.target.value as BoothId)} aria-label={L('dashboard.byBooth').th}
          className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 text-phantom-text font-kanit">
          {BOOTH_IDS.map((b) => <option key={b} value={b}>{L(`booth.${b}`).th}</option>)}
        </select>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label={L('dashboard.expenseDesc').th}
          placeholder={L('dashboard.expenseDesc').th}
          className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 text-phantom-text focus:border-phantom-yellow/60 focus:outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label={L('dashboard.expenseAmount').th}
          placeholder={L('dashboard.expenseAmount').th}
          className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-surface2 px-3 py-2 text-phantom-text font-mono focus:border-phantom-yellow/60 focus:outline-none" />
        <Button variant="primary" onClick={saveExpense} className="min-h-[44px]">
          {L('dashboard.save').th} · {L('dashboard.save').en}
        </Button>
      </Panel>
    </div>
  )
}
