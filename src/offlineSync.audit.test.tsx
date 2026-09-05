/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OFFLINE + SYNC — acceptance criterion
 * (`2026-07-24-hq-comms-crosssell-design.md`, the last of the hq-comms set):
 *
 *   "ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน"
 *
 * The spec's §5 ("Offline Strategy — ยังรอดครบ") is the mechanism, five bullets:
 *
 *   §5.1 Collection ใหม่ทุกตัวใช้ Firestore persistence เดียวกับ core → อ่าน/เขียน offline ได้
 *   §5.2 `messages` ที่ส่งตอน offline → คิวใน local, sync เมื่อเน็ตกลับ
 *   §5.3 `pricingOverrides` cache ในเครื่อง
 *   §5.4 `passports` stamp เป็น idempotent (code+boothId) → sync ซ้ำไม่พัง
 *   §5.5 `presence` heartbeat หยุดตอน offline → HQ เห็นเป็น "หลุด" ถูกต้อง
 *
 * ── THE TRAP IN THE WORDING, AND HOW THIS FILE ANSWERS IT ───────────────────
 * Read literally, "ทุกฟีเจอร์ **ใหม่**" points at Happy-Hour, Cash Reconciliation
 * and Passport — three features that DO NOT EXIST in `src/` (G1/G2/G3 prove it
 * by census, not by assertion). If the criterion is read as being only about
 * them it is unanswerable, and no honest test can be written at all.
 *
 * So the criterion is split, and each part gets the treatment it can bear:
 *
 *   (1) THE OFFLINE CONFIGURATION — real, present, and fully provable.
 *       Groups C and D: what `src/lib/firebase.ts` declares, and the census
 *       that says nothing in the app opens a second, unconfigured door.
 *   (2) "sync กลับได้" — NOT provable here, and NOT faked. Group W proves the
 *       one half that IS ours: the app-side precondition that makes an offline
 *       write usable at a booth.
 *   (3) "โดยข้อมูลไม่ชน" — group X states the conflict model by construction and
 *       CITES the pins that already exist rather than reopening them.
 *   (4) THE MISSING FEATURES — group G, pinned as gaps with grep as evidence.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - `src/lib/firebase.ts` hands Firestore a `persistentLocalCache` with the
 *     MULTIPLE-tab manager, and no memory cache / single-tab manager anywhere.
 *   - Every Firestore handle in production comes from that one `getDb()`.
 *     `getFirestore()` — which would return an UNCONFIGURED, memory-only
 *     instance and silently drop offline persistence — appears nowhere.
 *   - With every write left permanently unresolved (which is exactly what the
 *     Firestore SDK does while offline: the local cache applies the write, the
 *     returned promise waits for a server ack that is not coming), the booth
 *     still issues a queue number, the 🆘 button still fires, and the queue
 *     panel still offers its undo. The UI does not wait on the network.
 *   - No write call site in the app `await`s its repo call before advancing
 *     the screen — swept over source, with the call-site census pinned.
 *
 * WHAT IS **NOT** PROVED:
 *   - 🚨 SYNC IS NOT TESTED, AND IS NOT CLAIMED. Queueing writes while offline
 *     and flushing them on reconnect is Firestore SDK + server behaviour. There
 *     is no network, no emulator and no IndexedDB in this run — jsdom cannot
 *     even hold the cache (the suite prints "Falling back to memory cache" for
 *     precisely this reason). What is proved is that the app ASKS for it, and
 *     that the app can be used while the ask is outstanding. Same shape as
 *     `alert D3` (arrayUnion dedupe) and `donation U4` (realtime).
 *     🚫 A test that mocks the SDK and then claims "sync works" is testing the
 *     mock. This file does not contain one.
 *   - 🚨 NO CONFLICT IS RESOLVED, AND NONE IS SIMULATED. X0 states the model
 *     that IS in the code (last-write-wins merge, no transaction anywhere).
 *     Whether last-write-wins is the RIGHT model for two booths editing one
 *     order is a human's call; `idempotency E1` already pins the open race.
 *   - No IndexedDB is opened, no quota is exercised, no reconnect is performed.
 *
 * ── ช่องว่างที่พบ / GAPS FOUND (recorded, deliberately NOT fixed this round) ──
 *   GAP-1..3 (G1/G2/G3) §5.3, §5.4 and §4.5 describe offline behaviour for
 *          `pricingOverrides`, `passports` and `cashSessions`. NONE of the three
 *          features exists — zero production files mention them. There is
 *          nothing to make offline-safe yet. Same shape as `hq G0`, `pwa I1`,
 *          `alert C5`, `donation T1–T3`: if one of these ever goes RED it means
 *          somebody BUILT the feature — that is the fix, not a regression.
 *   GAP-4  (G4) §5.5 asks the presence heartbeat to STOP when offline.
 *          `useHeartbeat.ts` is an unconditional `setInterval`; the word
 *          `navigator.onLine` and the `'offline'` event appear nowhere in the
 *          app. The OBSERVABLE §5.5 actually wants still holds for a REMOTE
 *          watcher — the beats queue locally and never reach HQ, so HQ's
 *          `lastSeen` goes stale and the device reads as "หลุด" — but that is a
 *          consequence of the transport, not of the code doing what §5.5 says.
 *          On the offline device's OWN screen the beats land in the local cache
 *          and it keeps showing itself online. Recorded, not patched.
 *   GAP-5  (G5) NOTHING IN THE APP DISTINGUISHES A QUEUED WRITE FROM A SYNCED
 *          ONE. Firestore exposes `snapshot.metadata.hasPendingWrites` for
 *          exactly this; it, `includeMetadataChanges` and
 *          `waitForPendingWrites` appear nowhere in `src/`. An operator whose
 *          wifi died sees a screen that is indistinguishable from a healthy
 *          one. This is the sharpest real gap under "sync กลับได้".
 *   GAP-6  (G6) Four write call sites have no `.catch(` at all
 *          (`QueuePanel` ×2, `CommsToast` ack, `useHeartbeat`) while the other
 *          four do. Offline that is harmless — the promise merely stays pending
 *          — but a REJECTED write there is swallowed with no trace.
 *
 * 🚫 THIS ROUND CHANGES NO `src/` PRODUCTION CODE. Three of the six gaps are
 *    missing features whose construction would touch accounting/menu logic
 *    (out of scope); the other three are judgement calls for a human. Every one
 *    is recorded with coordinates instead of being patched or hidden.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { Order } from './domain/types'

// ── the SDK boundary — everything above it is the real application ──────────
const sdk = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn((_db: unknown, path: string) => ({ __ref: path })),
  query: vi.fn((ref: { __ref: string }) => ({ __ref: ref.__ref })),
  where: vi.fn((...a: unknown[]) => ({ __where: a })),
  doc: vi.fn((_db: unknown, path: string, id: string) => ({ __doc: [path, id] })),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  arrayUnion: vi.fn((v: unknown) => ({ __arrayUnion: v })),
  deleteField: vi.fn(() => ({ __delete: true })),
}))
vi.mock('firebase/firestore', () => sdk)
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))
vi.mock('./lib/firebase', () => ({ getDb: () => ({ __db: true }) }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') } }))

import { OrderStation } from './screens/OrderStation'
import { QueuePanel } from './screens/QueuePanel'
import { AlertButtons } from './comms/AlertButtons'
import { createOrder } from './order/ordersRepo'

const REPO = process.cwd()

/** Read a repo-relative file, proving the read actually landed on something.
 *  `pwa S0`: a bad path throws at import and the file reports ZERO tests while
 *  the suite still says "passed". Never read without this guard. */
function read(rel: string): string {
  const p = join(REPO, rel)
  expect(existsSync(p), `${rel} does not exist — the sweep is watching nothing`).toBe(true)
  const src = readFileSync(p, 'utf8')
  expect(src.length, `${rel} read as empty`).toBeGreaterThan(20)
  return src
}

/** Every production source file under src/ — no tests, no audits. */
function productionFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) { walk(full); continue }
      if (!/\.tsx?$/.test(e.name)) continue
      if (/\.test\.tsx?$/.test(e.name)) continue
      out.push(relative(REPO, full).replace(/\\/g, '/'))
    }
  }
  walk(join(REPO, 'src'))
  return out.sort()
}

// ════════════════════════════════════════════════════════════════════════════
// THE OFFLINE HARNESS
//
// Firestore's documented offline behaviour: the write is applied to the local
// cache immediately, and the promise `addDoc`/`updateDoc`/`setDoc` returns does
// NOT settle until the server acknowledges. So "offline" here means: every
// write returns a promise that never settles. Anything in the UI that waits on
// one is, at a booth with dead wifi, a screen that never moves again.
// ════════════════════════════════════════════════════════════════════════════
const PENDING = Symbol('still-pending')
function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {})
}
async function stillPending(p: unknown): Promise<boolean> {
  return (await Promise.race([p, Promise.resolve(PENDING)])) === PENDING
}

/** Snapshot callbacks the real repos registered, keyed by collection path. */
const listeners = new Map<string, ((snap: { docs: { id: string; data: () => unknown }[] }) => void)[]>()

function push(path: string, docs: { id: string }[]): void {
  const cbs = listeners.get(path) ?? []
  expect(cbs.length, `nothing subscribed to '${path}' — the panel is watching nothing`).toBeGreaterThan(0)
  act(() => cbs.forEach((cb) => cb({
    docs: docs.map((d) => ({ id: d.id, data: () => { const { id: _id, ...rest } = d; return rest } })),
  })))
}

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  listeners.clear()
  // OFFLINE: every write hangs. No `mockResolvedValue` anywhere in this file.
  sdk.addDoc.mockImplementation(() => neverSettles())
  sdk.updateDoc.mockImplementation(() => neverSettles())
  sdk.setDoc.mockImplementation(() => neverSettles())
  sdk.onSnapshot.mockImplementation((ref: { __ref: string }, cb: never) => {
    const list = listeners.get(ref.__ref) ?? []
    list.push(cb)
    listeners.set(ref.__ref, list)
    return () => {}
  })
})
afterEach(() => vi.restoreAllMocks())

// ════════════════════════════════════════════════════════════════════════════
// C. §5.1 — the persistence the whole strategy rests on
// ════════════════════════════════════════════════════════════════════════════

/** Violations in a Firestore bootstrap source. Empty = configured for offline. */
const CACHE_MARKS: [string, RegExp][] = [
  ['no-initializeFirestore', /initializeFirestore\s*\(/],
  ['no-persistentLocalCache', /localCache\s*:\s*persistentLocalCache\s*\(/],
  ['no-multi-tab-manager', /persistentMultipleTabManager\s*\(/],
]
const CACHE_POISONS: [string, RegExp][] = [
  ['memory-cache', /memoryLocalCache\s*\(/],
  ['single-tab-manager', /persistentSingleTabManager\s*\(/],
  ['unconfigured-handle', /\bgetFirestore\s*\(/],
]
function cacheViolations(src: string): string[] {
  const v: string[] = []
  for (const [name, re] of CACHE_MARKS) if (!re.test(src)) v.push(name)
  for (const [name, re] of CACHE_POISONS) if (re.test(src)) v.push(name)
  return v
}

describe('C. §5.1 the offline cache is configured', () => {
  /**
   * C0 — THE CONTROL, both directions. A sweep that returns [] because it is
   * blind is indistinguishable from a sweep that returns [] because the code is
   * clean (`neon G1`, `pwa V1`, `fz F2`, `rtt T3`, `donation T2` — five times).
   * So feed the checker something it MUST flag, and something it must not.
   */
  test('C0: cacheViolations flags a memory-cache bootstrap and clears a persistent one', () => {
    const BAD = `import { getFirestore, memoryLocalCache } from 'firebase/firestore'
      export function getDb() { return getFirestore(app, { localCache: memoryLocalCache() }) }`
    expect(cacheViolations(BAD).sort()).toStrictEqual([
      'memory-cache', 'no-initializeFirestore', 'no-multi-tab-manager',
      'no-persistentLocalCache', 'unconfigured-handle',
    ])

    const GOOD = `import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
      const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`
    expect(cacheViolations(GOOD)).toStrictEqual([])

    // and a single-tab bootstrap is NOT waved through just because it persists
    // /g is not decoration: GOOD names the manager twice (import + call) and a
    // single `replace` would only rewrite the import, leaving a fixture that is
    // still multi-tab — a decoy that never decoys.
    const SINGLE = GOOD.replace(/persistentMultipleTabManager/g, 'persistentSingleTabManager')
    expect(SINGLE).not.toContain('persistentMultipleTabManager')
    expect(cacheViolations(SINGLE)).toStrictEqual(['no-multi-tab-manager', 'single-tab-manager'])
  })

  /**
   * C1 — the real file. §5 says every collection rides "Firestore persistence
   * เดียวกับ core"; this is that persistence, and it is the single point the
   * whole criterion depends on.
   */
  test('C1: src/lib/firebase.ts asks Firestore for a persistent local cache', () => {
    expect(cacheViolations(read('src/lib/firebase.ts'))).toStrictEqual([])
  })

  /**
   * C2 — a canary pinning the declaration VERBATIM. C1 asks whether the
   * properties hold; C2 pins the exact text, so that a deliberate retune is
   * forced to come here and say so out loud. (Rule (ฒ): letter vs behaviour.)
   *
   * The multi-tab manager is not decoration: with the single-tab manager only
   * ONE tab gets the persistent cache and the rest silently fall back, which is
   * precisely the "HQ สองเครื่อง / สองแท็บ" arrangement the hq-comms criteria
   * are built on.
   */
  test('C2: the tab manager is the MULTIPLE-tab one, pinned verbatim', () => {
    const src = read('src/lib/firebase.ts')
    expect(src).toContain('localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })')
    expect(src).not.toContain('persistentSingleTabManager')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. §5.1 — one configured handle, and no second door
//
// A `getFirestore()` call anywhere would return the DEFAULT instance: no
// persistent cache, no offline reads, no queued writes — and it would work
// perfectly in every test and every demo with wifi. This is a census, not a
// whitelist (rule: census > whitelist).
// ════════════════════════════════════════════════════════════════════════════

/** Firestore entry points a module CALLS to get a database handle. The
 *  declaration in `lib/firebase.ts` is not a call site — `function getDb()` is
 *  where the handle is made, not where it is reached for. */
function handleCalls(src: string): { getDb: number; getFirestore: number } {
  const count = (name: string) => {
    const re = new RegExp(`\\b${name}\\s*\\(`, 'g')
    let n = 0
    for (let m = re.exec(src); m; m = re.exec(src)) {
      if (!/\bfunction\s+$/.test(src.slice(Math.max(0, m.index - 30), m.index))) n++
    }
    return n
  }
  return { getDb: count('getDb'), getFirestore: count('getFirestore') }
}

describe('D. §5.1 every collection rides the one configured handle', () => {
  /** D0 — the control for `handleCalls`, both directions. */
  test('D0: handleCalls sees an unconfigured handle and does not invent one', () => {
    expect(handleCalls(`addDoc(collection(getFirestore(), 'passports'), p)`))
      .toStrictEqual({ getDb: 0, getFirestore: 1 })
    expect(handleCalls(`addDoc(collection(getDb(), 'passports'), p)`))
      .toStrictEqual({ getDb: 1, getFirestore: 0 })
    expect(handleCalls(`// nothing to do with firestore at all`))
      .toStrictEqual({ getDb: 0, getFirestore: 0 })
  })

  /**
   * D1 — the census spine. Pins WHICH production modules reach for the database
   * and HOW MANY times. A blind sweep cannot survive this: it pins what the
   * scan FINDS, not only what it fails to find.
   */
  test('D1: exactly three repos touch Firestore, each through getDb()', () => {
    const files = productionFiles()
    expect(files.length, 'the walk found no production files').toBeGreaterThan(30)

    const census: Record<string, number> = {}
    for (const f of files) {
      const n = handleCalls(read(f)).getDb
      if (n > 0) census[f] = n
    }
    expect(census).toStrictEqual({
      'src/comms/commsRepo.ts': 5,     // messages ×3, presence ×2
      'src/expense/expensesRepo.ts': 2,
      'src/order/ordersRepo.ts': 4,
    })
  })

  /**
   * D2 — and no module anywhere opens the unconfigured door. Stated over the
   * WHOLE tree, including files that do not exist yet in anyone's imagination.
   */
  test('D2: getFirestore() appears in no production file', () => {
    const offenders = productionFiles().filter((f) => handleCalls(read(f)).getFirestore > 0)
    expect(offenders).toStrictEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// W. "ทำงานตอน offline" — the half of sync that IS ours
//
// Every write below returns a promise that never settles. That is not a
// contrivance: it is what the SDK does when the wifi is gone.
// ════════════════════════════════════════════════════════════════════════════

describe('W. the booth keeps working while every write hangs', () => {
  /**
   * W0 — THE HARNESS SPINE. If the mocked writes settled, W1–W3 would prove
   * nothing about offline at all — they would be ordinary happy-path tests
   * wearing an offline title. So prove the pending-ness itself, through the
   * REAL repo function, before believing anything below it.
   */
  test('W0: a real repo write returns a promise that never settles', async () => {
    const p = createOrder(o({}) as Omit<Order, 'id'>)
    p.catch(() => {})
    expect(sdk.addDoc).toHaveBeenCalledTimes(1)
    expect(await stillPending(p), 'the offline harness is not offline').toBe(true)
    // and the control: a settling promise is NOT reported as pending
    expect(await stillPending(Promise.resolve('acked'))).toBe(false)
  })

  /**
   * W1 — the one that matters at a real booth. The customer is standing there.
   * The write cannot reach the server. They must still get a queue number.
   */
  test('W1: an order taken offline still issues its queue number', async () => {
    const user = userEvent.setup()
    render(<OrderStation booth="drinks" station="A" />)

    await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่นมสดปั่น/ }))
    await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
    await user.click(screen.getByRole('button', { name: /เงินสด/ }))
    await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))

    expect(screen.getByTestId('issued-queue')).toHaveTextContent('A1')
    expect(sdk.addDoc).toHaveBeenCalledTimes(1)
    expect(await stillPending(sdk.addDoc.mock.results[0].value)).toBe(true)
    // the cart cleared and no failure was reported: the screen advanced on the
    // local write, not on an acknowledgement it is never going to get
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByTestId('cart-total')).toHaveTextContent('0')
  })

  /**
   * W2 — §5.2. The 🆘 message queues locally; the sender must be told nothing
   * went wrong, because nothing has. (`alert A1` pins the document's shape;
   * this pins that pressing it offline is not an error state.)
   */
  test('W2: 🆘 pressed offline is sent and reports no failure', async () => {
    const user = userEvent.setup()
    render(<AlertButtons booth="drinks" mode="order" />)

    await user.click(screen.getByRole('button', { name: /🆘/ }))

    expect(sdk.addDoc).toHaveBeenCalledTimes(1)
    expect(sdk.addDoc.mock.calls[0][0]).toStrictEqual({ __ref: 'messages' })
    expect(await stillPending(sdk.addDoc.mock.results[0].value)).toBe(true)
    expect(screen.queryByRole('alert'), 'an unacknowledged write was reported as a failure').toBeNull()
  })

  /**
   * W3 — the queue panel. Its cards repaint from snapshots, which offline come
   * from the local cache — not modelled here. What IS modelled is the operator
   * affordance the panel owns outright: pressing เสร็จ must register, and the
   * undo must appear, with the write still in flight.
   */
  test('W3: a queue transition offline still records its undo', async () => {
    const user = userEvent.setup()
    render(<QueuePanel booth="drinks" station="A" />)
    push('orders', [o({ id: 'o1', status: 'serving' })])

    await user.click(screen.getByRole('button', { name: 'เสร็จ' }))

    expect(sdk.updateDoc).toHaveBeenCalledTimes(1)
    expect(await stillPending(sdk.updateDoc.mock.results[0].value)).toBe(true)
    expect(screen.getByRole('button', { name: /ย้อนกลับ/ })).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// W4/W5. the same property, swept over source rather than one screen at a time
// ════════════════════════════════════════════════════════════════════════════

/** The repo functions that write. Reads (`subscribe*`) are irrelevant here. */
const WRITE_FNS = ['createOrder', 'updateOrderStatus', 'sendMessage', 'ackMessage', 'upsertPresence', 'addExpense']

type Site = { file: string; fn: string; awaited: boolean; caught: boolean }

/** Index just past the `(...)` that starts at `open`. Paren-counting, so a call
 *  spanning several lines is one site — `BroadcastBar` writes exactly that way
 *  and a line-at-a-time reader would call its `.catch` missing. */
function afterArgs(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++
    else if (src[i] === ')') { depth--; if (depth === 0) return i + 1 }
  }
  return src.length
}

/** Classify every write call in ONE source. The control (W4a) and the sweep
 *  (W4b/c) run this exact function, so a blind classifier cannot pass one and
 *  fail the other. Declarations (`function sendMessage(`) are not call sites. */
function sitesInSource(file: string, src: string): Site[] {
  const out: Site[] = []
  for (const fn of WRITE_FNS) {
    const re = new RegExp(`\\b${fn}\\s*\\(`, 'g')
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const before = src.slice(Math.max(0, m.index - 30), m.index)
      if (/\bfunction\s+$/.test(before)) continue
      const tail = src.slice(afterArgs(src, m.index + m[0].length - 1))
      out.push({
        file, fn,
        awaited: /\bawait\s+$/.test(before),
        caught: /^\s*\.catch\s*\(/.test(tail),
      })
    }
  }
  return out
}

/** Every call site of a write function in UI code, and how it treats the promise. */
function writeSites(files: string[]): Site[] {
  return files
    .filter((f) => /^src\/(screens|comms|dashboard)\//.test(f))
    .flatMap((f) => sitesInSource(f, read(f)))
}

describe('W4. no screen waits on the network', () => {
  /** W4a — the control for `writeSites`, both directions, on fixtures. */
  test('W4a: sitesInSource tells an awaited call from a fired-and-caught one', () => {
    const p = (src: string) => sitesInSource('f', src)
    expect(p('  await createOrder(order)')).toStrictEqual([{ file: 'f', fn: 'createOrder', awaited: true, caught: false }])
    expect(p('  createOrder(order).catch(() => setError(q))')).toStrictEqual([{ file: 'f', fn: 'createOrder', awaited: false, caught: true }])
    expect(p('  updateOrderStatus(id, patch)')).toStrictEqual([{ file: 'f', fn: 'updateOrderStatus', awaited: false, caught: false }])
    // a call broken over lines is ONE site, and its .catch still counts
    expect(p('  sendMessage({\n    kind: "text",\n  }).catch(() => setError(true))'))
      .toStrictEqual([{ file: 'f', fn: 'sendMessage', awaited: false, caught: true }])
    // and a declaration is not a call site
    expect(p('export async function sendMessage(msg) { return 1 }')).toStrictEqual([])
    expect(p('  const x = 1')).toStrictEqual([])
  })

  /**
   * W4b — the census spine. Pins EVERY write call site in the UI. A sweep gone
   * blind returns an empty list, and an empty list cannot equal this one.
   */
  test('W4b: the write call sites in UI code are exactly these', () => {
    const sites = writeSites(productionFiles()).map((s) => `${s.file} ${s.fn}`).sort()
    expect(sites).toStrictEqual([
      'src/comms/AlertButtons.tsx sendMessage',
      'src/comms/BroadcastBar.tsx sendMessage',
      'src/comms/CommsToast.tsx ackMessage',
      'src/comms/useHeartbeat.ts upsertPresence',
      'src/screens/DashboardScreen.tsx addExpense',
      'src/screens/OrderStation.tsx createOrder',
      'src/screens/QueuePanel.tsx updateOrderStatus',
      'src/screens/QueuePanel.tsx updateOrderStatus',
    ])
  })

  /**
   * W4c — THE criterion clause, swept. Not one of those call sites blocks on
   * its promise. This is what makes the whole app usable with dead wifi, and
   * it is a property nothing else in the suite watches.
   */
  test('W4c: no UI write is awaited before the screen moves on', () => {
    const awaited = writeSites(productionFiles()).filter((s) => s.awaited)
    expect(awaited).toStrictEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// G. the gaps — §5.3, §5.4, §5.5, and the missing features themselves
// ════════════════════════════════════════════════════════════════════════════

/** Production files mentioning any of these words. Case-insensitive. */
function filesMentioning(words: string[]): string[] {
  const re = new RegExp(words.join('|'), 'i')
  return productionFiles().filter((f) => re.test(read(f)))
}

describe('G. what the criterion asks for that does not exist yet', () => {
  /**
   * G0 — THE CONTROL for `filesMentioning`. Rule (ฐ): a `filter` over a blind
   * predicate returns [] and every gap test below goes green while proving
   * nothing. So make the same predicate find something real first.
   */
  test('G0: filesMentioning finds a feature that DOES exist', () => {
    expect(filesMentioning(['sendMessage'])).toStrictEqual([
      'src/comms/AlertButtons.tsx',
      'src/comms/BroadcastBar.tsx',
      'src/comms/commsRepo.ts',
    ])
    expect(filesMentioning(['ZZZ-NO-SUCH-TOKEN-ZZZ'])).toStrictEqual([])
  })

  /**
   * G1 — §5.3 `pricingOverrides` cache ในเครื่อง. GAP: the feature is absent.
   * 🚨 RED HERE MEANS SOMEBODY BUILT HAPPY-HOUR — go make its offline story
   * real and rewrite this test; it is not a regression.
   */
  test('G1: GAP §5.3 — no production code mentions Happy-Hour pricing at all', () => {
    expect(filesMentioning(['pricingOverride', 'happyHour'])).toStrictEqual([])
  })

  /** G2 — §5.4 `passports` idempotent stamps. GAP: the feature is absent. */
  test('G2: GAP §5.4 — no production code mentions passports or stamps', () => {
    expect(filesMentioning(['passport', 'stampedBooths'])).toStrictEqual([])
  })

  /** G3 — §4.5 cash reconciliation, the third "ฟีเจอร์ใหม่". GAP: absent. */
  test('G3: GAP §4.5 — no production code mentions cash sessions', () => {
    expect(filesMentioning(['cashSession', 'countedCash'])).toStrictEqual([])
  })

  /**
   * G4 — §5.5 "presence heartbeat หยุดตอน offline". GAP: nothing in the app
   * knows whether it is offline. The heartbeat is an unconditional interval.
   * Read GAP-4 in the header before touching this — the observable HQ wants
   * still holds, but by accident of transport, not by this code.
   */
  test('G4: GAP §5.5 — the app has no offline awareness, and the heartbeat never stops', () => {
    // the three ways a web app can learn it is offline — none of them is used
    expect(filesMentioning(['navigator\\.onLine', 'addEventListener\\(\\s*[\'"]offline', 'ononline'])).toStrictEqual([])

    const src = read('src/comms/useHeartbeat.ts')
    expect(src).toContain('const timer = setInterval(beat, HEARTBEAT_MS)')   // unconditional
    expect(src).not.toMatch(/onLine|addEventListener/)                        // and unaware
  })

  /**
   * G5 — the sharpest gap under "sync กลับได้": an operator cannot tell a
   * queued write from a synced one. Firestore hands the answer over for free.
   */
  test('G5: GAP — nothing reads hasPendingWrites, so a queued write is invisible', () => {
    expect(filesMentioning(['hasPendingWrites', 'includeMetadataChanges', 'waitForPendingWrites']))
      .toStrictEqual([])
  })

  /**
   * G6 — which writes have an error path and which do not. Pinned as a census
   * so the split is a decision on the record rather than an oversight.
   */
  test('G6: GAP — four of the eight write call sites have no .catch at all', () => {
    const uncaught = writeSites(productionFiles()).filter((s) => !s.caught).map((s) => `${s.file} ${s.fn}`).sort()
    expect(uncaught).toStrictEqual([
      'src/comms/CommsToast.tsx ackMessage',
      'src/comms/useHeartbeat.ts upsertPresence',
      'src/screens/QueuePanel.tsx updateOrderStatus',
      'src/screens/QueuePanel.tsx updateOrderStatus',
    ])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// X. "โดยข้อมูลไม่ชน" — state the model, cite the pins, do not reopen them
// ════════════════════════════════════════════════════════════════════════════

describe('X. the conflict model, stated rather than assumed', () => {
  /**
   * X0 — every write in the app is an unconditional merge. There is no
   * `runTransaction`, no `writeBatch`, no compare-and-set anywhere: whoever
   * writes last wins, field by field.
   *
   * 📌 CITED, NOT REOPENED: `idempotency E1` already pins that the double-press
   * guard is per-panel and cannot see another device, and that closing the race
   * needs `runTransaction` — which touches the repo layer and `firestore.rules`
   * (out of scope). The `Undo` criterion already pins the merge-vs-snapshot bug
   * of the same species. This test states the model; those two own the verdict.
   */
  test('X0: conflict resolution is last-write-wins — no transaction exists', () => {
    expect(filesMentioning(['runTransaction', 'writeBatch'])).toStrictEqual([])
    const repo = read('src/comms/commsRepo.ts')
    expect(repo).toContain("setDoc(doc(getDb(), 'presence', p.id), p, { merge: true })")
  })

  /**
   * X1 — and the clock that decides "online" is the WRITER'S clock, never the
   * server's. After an offline stretch the queued heartbeats flush carrying
   * timestamps from a device whose clock nobody synchronised, and the reader
   * compares them against its own. `serverTimestamp` exists for this and is
   * used nowhere.
   */
  test('X1: presence timestamps are client clocks, not server ones', () => {
    expect(filesMentioning(['serverTimestamp'])).toStrictEqual([])
    expect(read('src/comms/useHeartbeat.ts')).toContain('lastSeen: Date.now()')
  })
})
