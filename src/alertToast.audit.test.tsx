/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🆘 alert toast — acceptance criterion
 * (`2026-07-24-hq-comms-crosssell-design.md`, criterion 2 of the hq-comms set):
 *
 *   "ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้"
 *
 * The spec's §113/§117 state the mechanism this sweeps:
 *
 *   > ปุ่มลัด 3 ปุ่ม: 🆘 ขอคนช่วย · 📦 ของใกล้หมด · ✅ เคลียร์แล้ว
 *   > → สร้าง `messages{kind:"alert", presetCode, scope:"all"}`
 *   > Listener บน `/messages` → toast เด้ง + ปุ่ม ✔ ack (เพิ่ม deviceId เข้า `ackBy`)
 *
 * The criterion has FOUR clauses and each one is proved a different way:
 *
 *   A. "ซุ้มกดปุ่ม 🆘"        — the button exists and emits an exact message shape.
 *   B. "HQ + ซุ้มอื่นเห็น toast" — delivery, including the half that is easy to fake:
 *                              the SENDER must NOT see their own alert.
 *   C. "ภายในไม่กี่วิ (เมื่อ online)" — the delivery path is PUSH, not poll, and the
 *                              online threshold is EVALUATED as arithmetic.
 *   D. "ack ได้"              — ack the SAME id across the barrier and watch it go.
 *
 * ── HOW THIS FILE IS WIRED ──────────────────────────────────────────────────
 * The mock boundary is the **Firebase SDK**, not the repo. `AlertButtons`,
 * `commsRepo`, `commsLogic` and `CommsToast` all run for real; only
 * `firebase/firestore` and `getDb` are fakes. So the object a sender's click
 * actually writes is the same object the receiver's toast actually reads —
 * a chain, not two tests agreeing with a shared fixture.
 *
 * "Two devices" is simulated by swapping `localStorage['phantom.deviceId']`
 * between renders, because `getDeviceId()` is backed by localStorage and a
 * jsdom document has exactly one. Every cross-device test therefore unmounts
 * before it switches identity.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - Pressing 🆘 writes one document to `messages` whose shape is pinned FIELD
 *     FOR FIELD (`toStrictEqual`, never `objectContaining` — an extra field is
 *     exactly the species of bug the Undo criterion was closed on).
 *   - The message a sender produces is visible to an HQ device and to a second
 *     booth's device, and is NOT visible on the sending device.
 *   - Nothing in the delivery path polls: `subscribeMessages` registers an
 *     `onSnapshot` listener, and the toast paints from that callback with the
 *     clock frozen.
 *   - `isOnline` is evaluated at real millisecond values on both sides of its
 *     threshold, not merely grepped for.
 *   - Acking hides THAT message from THAT device, and only that device.
 *
 * WHAT IS **NOT** PROVED:
 *   - 🚨 "ภายในไม่กี่วิ" IS NOT MEASURED, AND IS NOT CLAIMED. There is no network
 *     and no Firestore here; timing a mock would time the mock. What is proved
 *     is the SHAPE that makes seconds possible — a push subscription with no
 *     poll interval standing between the write and the paint. Real latency is a
 *     property of Firestore and the venue's wifi, and belongs to a human with
 *     two devices, not to jsdom.
 *   - 🚨 `arrayUnion` DEDUPE IS ASSUMED, NOT PROVED. D3 proves the ack path uses
 *     `arrayUnion`; that a union does not grow on a repeat is Firestore's
 *     documented server-side semantics, which no test in this repo can execute.
 *   - 🚨 NO SOUND IS PLAYED OR ASSERTED. §117 asks for "เสียงเบา" alongside the
 *     toast. `CommsToast` renders no audio at all — recorded as a GAP below,
 *     not quietly folded into a passing assertion.
 *   - The toast is not proved to be legible, well-placed, or noticeable. Those
 *     are the Neon Clarity / glanceable criteria's business.
 *
 * ── ช่องว่างที่พบ / GAPS FOUND (recorded, deliberately NOT fixed this round) ──
 *   GAP-1  §117 asks the alert toast to be accompanied by a soft sound distinct
 *          from the queue chime. `CommsToast.tsx` has no audio path whatsoever.
 *          C5 pins this as a gap the way Idempotency's E1 pinned its race: if
 *          C5 ever goes RED that means somebody ADDED the sound — that is the
 *          fix, not a regression. Read this header before "repairing" it.
 *   GAP-2  §118 asks Display to surface important alerts in a thin top bar.
 *          `DisplayScreen` mounts no comms UI at all (B5 pins that it does not).
 *          Whether the customer-facing screen SHOULD show staff alerts is a
 *          judgement call for a human, not something to decide unattended — and
 *          it is not part of THIS criterion, which names HQ and booths only.
 *
 * 🚫 THIS ROUND CHANGES NO `src/` PRODUCTION CODE. The Out-of-scope list forbids
 *    changing comms logic, and `frozenZones` F2 freezes `commsLogic.ts` and
 *    `commsRepo.ts` byte-for-byte. Both gaps above are therefore recorded with
 *    coordinates rather than patched.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Message } from './comms/types'
import type { BoothId } from './domain/types'

// ── the SDK boundary — everything above it is the real application ──────────
const { addDoc, onSnapshot, collection, doc, updateDoc, setDoc, arrayUnion } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn((_db: unknown, path: string) => ({ __collection: path })),
  doc: vi.fn((_db: unknown, path: string, id: string) => ({ __doc: [path, id] })),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  arrayUnion: vi.fn((v: unknown) => ({ __arrayUnion: v })),
}))
vi.mock('firebase/firestore', () => ({ addDoc, onSnapshot, collection, doc, updateDoc, setDoc, arrayUnion }))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))
vi.mock('./lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { AlertButtons } from './comms/AlertButtons'
import { CommsToast } from './comms/CommsToast'
import { visibleMessages, isOnline } from './comms/commsLogic'
import { L } from './i18n/labels'

const REPO = process.cwd()
const DEVICE_KEY = 'phantom.deviceId'
/** A fixed instant. `Date.now` is spied, NEVER faked with `vi.useFakeTimers()`,
 *  which silently clobbers a hand-controlled clock. */
const T0 = 1_760_000_000_000

/** Read a repo-relative file, proving the read actually landed on something. */
function read(rel: string): string {
  const p = join(REPO, rel)
  expect(existsSync(p), `${rel} does not exist — the sweep is watching nothing`).toBe(true)
  const src = readFileSync(p, 'utf8')
  expect(src.length, `${rel} read as empty`).toBeGreaterThan(20)
  return src
}

/** Become a device. Every cross-device test calls this between unmounts. */
function beDevice(id: string): void {
  localStorage.setItem(DEVICE_KEY, id)
}

/** The latest snapshot callback `subscribeMessages` handed to `onSnapshot`. */
let snapshotCb: ((snap: { docs: { id: string; data: () => unknown }[] }) => void) | null = null
let unsubscribes = 0

/** Push messages down the real subscription, as Firestore would. */
function pushFromServer(msgs: Message[]): void {
  expect(snapshotCb, 'no onSnapshot listener was registered — nothing is subscribed').not.toBeNull()
  act(() => snapshotCb!({ docs: msgs.map((m) => ({ id: m.id, data: () => { const { id: _id, ...rest } = m; return rest } })) }))
}

/** The one document `addDoc` was asked to write, as the app built it. */
function sentDoc(): Omit<Message, 'id'> {
  expect(addDoc, 'nothing was sent').toHaveBeenCalledTimes(1)
  return addDoc.mock.calls[0][1] as Omit<Message, 'id'>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  snapshotCb = null
  unsubscribes = 0
  addDoc.mockResolvedValue({ id: 'generated-id' })
  updateDoc.mockResolvedValue(undefined)
  onSnapshot.mockImplementation((_ref: unknown, cb: never) => {
    snapshotCb = cb
    return () => { unsubscribes += 1 }
  })
  vi.spyOn(Date, 'now').mockReturnValue(T0)
})
afterEach(() => vi.restoreAllMocks())

// ════════════════════════════════════════════════════════════════════════════
// A. "ซุ้มกดปุ่ม 🆘" — the button exists, and emits an exactly-shaped message
// ════════════════════════════════════════════════════════════════════════════
describe('A. the 🆘 button', () => {
  /**
   * A0 — the roster spine. Pins WHICH preset buttons exist and what they read,
   * so that a sweep below cannot go quietly blind by the presets being renamed
   * or the 🆘 one being dropped. §113 names all three.
   */
  test('A0: exactly the three spec presets are offered, 🆘 among them', () => {
    beDevice('booth-drinks-1')
    render(<AlertButtons booth="drinks" mode="order" />)
    const names = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    expect(names).toStrictEqual([
      `🆘 ${L('comms.needHelp').th}`,
      `📦 ${L('comms.lowStock').th}`,
      `✅ ${L('comms.cleared').th}`,
      L('comms.send').th,
    ])
  })

  /**
   * A1 — THE shape test. `toStrictEqual` on the document actually handed to
   * `addDoc`: every field pinned, and — the point — no field that nobody
   * declared. `objectContaining` / `toHaveBeenCalledWith` both wave surplus
   * fields through, which is the exact bug the Undo criterion was closed on.
   */
  test('A1: pressing 🆘 writes one alert to `messages`, field for field', async () => {
    const user = userEvent.setup()
    beDevice('booth-drinks-1')
    render(<AlertButtons booth="drinks" mode="order" />)

    await user.click(screen.getByRole('button', { name: `🆘 ${L('comms.needHelp').th}` }))

    expect(collection).toHaveBeenCalledWith({ __db: true }, 'messages')
    expect(addDoc.mock.calls[0][0]).toStrictEqual({ __collection: 'messages' })
    expect(sentDoc()).toStrictEqual({
      fromDeviceId: 'booth-drinks-1',
      fromBooth: 'drinks',
      fromMode: 'order',
      scope: 'all',
      kind: 'alert',
      presetCode: 'need_help',
      createdAt: T0,
      ackBy: [],
    })
  })

  /**
   * A2 — the identity that clause B depends on. If `fromDeviceId` were a
   * constant, "the sender does not see their own alert" would be either always
   * or never true, and B3 would stop meaning anything.
   */
  test('A2: the alert carries THIS device id, not a constant', async () => {
    const user = userEvent.setup()
    beDevice('some-other-tablet')
    render(<AlertButtons booth="drinks" mode="order" />)
    await user.click(screen.getByRole('button', { name: `🆘 ${L('comms.needHelp').th}` }))
    expect(sentDoc().fromDeviceId).toBe('some-other-tablet')
  })

  /** A3 — origin travels with the message; the booth is not hardcoded. */
  test('A3: the alert carries the pressing booth and mode', async () => {
    const user = userEvent.setup()
    beDevice('booth-photo-9')
    render(<AlertButtons booth="photo" mode="order" />)
    await user.click(screen.getByRole('button', { name: `🆘 ${L('comms.needHelp').th}` }))
    const sent = sentDoc()
    expect(sent.fromBooth).toBe('photo')
    expect(sent.fromMode).toBe('order')
    expect(sent.scope).toBe('all')
  })

  /** A4 — 🆘 is distinguishable from its two neighbours, not just "an alert". */
  test('A4: 🆘 sends need_help specifically, not merely some preset', async () => {
    const user = userEvent.setup()
    beDevice('booth-drinks-1')
    render(<AlertButtons booth="drinks" mode="order" />)
    await user.click(screen.getByRole('button', { name: `📦 ${L('comms.lowStock').th}` }))
    expect(sentDoc().presetCode).toBe('low_stock')
    addDoc.mockClear()
    await user.click(screen.getByRole('button', { name: `🆘 ${L('comms.needHelp').th}` }))
    expect(sentDoc().presetCode).toBe('need_help')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// B. "HQ + ซุ้มอื่นเห็น toast" — delivery, and the half that is easy to fake
// ════════════════════════════════════════════════════════════════════════════
describe('B. who sees the alert', () => {
  /** Produce a real 🆘 message by clicking the real button on `asDevice`. */
  async function alertFrom(asDevice: string, booth: BoothId): Promise<Message> {
    const user = userEvent.setup()
    beDevice(asDevice)
    const { unmount } = render(<AlertButtons booth={booth} mode="order" />)
    await user.click(screen.getByRole('button', { name: `🆘 ${L('comms.needHelp').th}` }))
    const sent = sentDoc()
    unmount()
    addDoc.mockClear()
    return { id: 'alert-1', ...sent }
  }

  /**
   * B1 — HQ sees it. Note the message is the one the SENDER's click produced,
   * carried across, not a fixture re-typed to match.
   */
  test('B1: an HQ dashboard device sees the alert the booth actually sent', async () => {
    const msg = await alertFrom('booth-drinks-1', 'drinks')

    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)
    pushFromServer([msg])

    const toast = screen.getByRole('status')
    expect(within(toast).getByText(L('comms.needHelp').th, { exact: false })).toBeInTheDocument()
    expect(toast.textContent).toContain(L('booth.drinks').th)
  })

  /** B2 — a second booth's order station sees the same message. */
  test('B2: another booth’s station sees it too', async () => {
    const msg = await alertFrom('booth-drinks-1', 'drinks')

    beDevice('booth-photo-1')
    render(<CommsToast booth="photo" />)
    pushFromServer([msg])

    expect(screen.getByRole('status').textContent).toContain(L('comms.needHelp').th)
  })

  /**
   * B3 — 🚨 the paired negative. `visibleMessages` filters
   * `fromDeviceId !== myDeviceId`, so a test that rendered the toast under the
   * SENDER's own id would be green while meaning the opposite thing. Without
   * this test, deleting that filter costs nothing.
   */
  test('B3: the sending device does NOT see its own alert', async () => {
    const msg = await alertFrom('booth-drinks-1', 'drinks')

    beDevice('booth-drinks-1') // same device that pressed the button
    render(<CommsToast booth="drinks" />)
    pushFromServer([msg])

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(L('comms.needHelp').th, { exact: false })).not.toBeInTheDocument()
  })

  /** B4 — scope is honoured in both directions, so 'all' is a real decision. */
  test('B4: scope routes the message — “all” reaches me, another booth’s does not', () => {
    const base: Message = {
      id: 'm', fromDeviceId: 'them', fromBooth: 'photo', fromMode: 'order',
      scope: 'all', kind: 'alert', presetCode: 'need_help', createdAt: T0, ackBy: [],
    }
    expect(visibleMessages([base], 'drinks', 'me').map((m) => m.id)).toStrictEqual(['m'])
    expect(visibleMessages([{ ...base, scope: 'drinks' }], 'drinks', 'me').map((m) => m.id)).toStrictEqual(['m'])
    expect(visibleMessages([{ ...base, scope: 'photo' }], 'drinks', 'me')).toStrictEqual([])
  })

  /**
   * B5 — the mount census: WHICH screens carry the toast. §117's listener is
   * for staff; the customer Display deliberately has none (see GAP-2). Nothing
   * anywhere pinned this intent before, so a stray mount on the Display — or
   * losing the HQ one — was a silent change.
   */
  test('B5: the toast is mounted on HQ and the order station, and not on the customer Display', () => {
    const sites: string[] = []
    for (const rel of ['src/screens/DashboardScreen.tsx', 'src/screens/OrderStation.tsx', 'src/screens/DisplayScreen.tsx', 'src/screens/QueuePanel.tsx', 'src/screens/SetupScreen.tsx', 'src/App.tsx']) {
      read(rel).split(/\r?\n/).forEach((line, i) => {
        if (/<CommsToast\b/.test(line)) sites.push(`${rel}:${i + 1}`)
      })
    }
    expect(sites).toStrictEqual([
      'src/screens/DashboardScreen.tsx:55',
      'src/screens/OrderStation.tsx:72',
    ])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// C. "ภายในไม่กี่วิ (เมื่อ online)" — push, not poll; and the threshold evaluated
// ════════════════════════════════════════════════════════════════════════════
describe('C. how fast, and when online', () => {
  /** A polling primitive standing between a write and a paint. */
  const POLL_SHAPE = /\bsetInterval\b|\bsetTimeout\b|\brequestAnimationFrame\b/

  /**
   * C0 — the checker spine, pinned BOTH ways. A sweep that reports nothing and
   * a sweep that cannot see anything are indistinguishable at the assertion, so
   * the scanner is fed a planted fixture and a clean one and must tell them
   * apart. Without this, C1 is green even if `POLL_SHAPE` matches nothing.
   */
  test('C0: the poll scanner reports a planted poll and stays quiet on clean code', () => {
    const planted = ['export function sub(cb) {', '  setInterval(() => cb(), 3000)', '}'].join('\n')
    const clean = ['export function sub(cb) {', '  return onSnapshot(ref, cb)', '}'].join('\n')
    const scan = (src: string) => src.split(/\r?\n/).filter((l) => POLL_SHAPE.test(l))
    expect(scan(planted)).toStrictEqual(['  setInterval(() => cb(), 3000)'])
    expect(scan(clean)).toStrictEqual([])
  })

  /**
   * C1 — the delivery path is a push subscription with no poll in it. This is
   * the honest form of "ภายในไม่กี่วิ": not a stopwatch, but the absence of an
   * interval standing between Firestore's write and the toast's paint.
   */
  test('C1: the message path subscribes with onSnapshot and polls nowhere', () => {
    const repo = read('src/comms/commsRepo.ts')
    expect(repo).toMatch(/onSnapshot\(\s*collection\(getDb\(\), 'messages'\)/)

    const offenders: string[] = []
    for (const rel of ['src/comms/commsRepo.ts', 'src/comms/CommsToast.tsx', 'src/comms/commsLogic.ts']) {
      read(rel).split(/\r?\n/).forEach((line, i) => {
        if (POLL_SHAPE.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(offenders).toStrictEqual([])
  })

  /**
   * C2 — the paint happens on the callback, with the clock never advanced. The
   * toast is on screen at the same `Date.now()` the message arrived at, and no
   * interval was ever scheduled. This is a claim about ORDERING, not duration.
   */
  test('C2: the toast paints from the snapshot callback without the clock moving', () => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval')
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    pushFromServer([{
      id: 'a', fromDeviceId: 'booth-drinks-1', fromBooth: 'drinks', fromMode: 'order',
      scope: 'all', kind: 'alert', presetCode: 'need_help', createdAt: T0, ackBy: [],
    }])

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(Date.now()).toBe(T0)
    expect(intervalSpy).not.toHaveBeenCalled()
  })

  /** C3 — subscribed on mount, released on unmount: no leak, no stale toast. */
  test('C3: it subscribes on mount and unsubscribes on unmount', () => {
    beDevice('hq-macbook')
    const { unmount } = render(<CommsToast booth="photo" />)
    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(unsubscribes).toBe(0)
    unmount()
    expect(unsubscribes).toBe(1)
  })

  /**
   * C4 — "(เมื่อ online)" EVALUATED, not grepped. The threshold is 90s, so the
   * arithmetic is checked on both sides of it and at the boundary itself.
   */
  test('C4: isOnline is evaluated across its 90-second threshold', () => {
    const p = { id: 'd', deviceId: 'd', booth: 'drinks' as BoothId, mode: 'order' as const, lastSeen: T0 }
    expect(isOnline(p, T0)).toBe(true)
    expect(isOnline(p, T0 + 1_000)).toBe(true)
    expect(isOnline(p, T0 + 89_999)).toBe(true)
    expect(isOnline(p, T0 + 90_000)).toBe(false) // the boundary is exclusive
    expect(isOnline(p, T0 + 120_000)).toBe(false)
  })

  /**
   * C5 — 🚨 A PINNED GAP, not a passing feature. §117 asks for a soft sound
   * beside the toast; `CommsToast` renders no audio path at all. This asserts
   * the ABSENCE so the hole cannot be forgotten. Shaped like Idempotency's E1:
   * if C5 ever goes RED, somebody ADDED the sound — that is the fix, not a
   * regression. Promote it to a real assertion then; do not delete it.
   */
  test('C5: GAP — the alert toast plays no sound, though §117 asks for one', () => {
    const toastSrc = read('src/comms/CommsToast.tsx')
    expect(toastSrc).toContain('role="status"')          // the toast half exists
    expect(toastSrc).not.toMatch(/Audio|play\(|\.mp3|chime|howl/i) // the sound half does not
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. "ack ได้"
// ════════════════════════════════════════════════════════════════════════════
describe('D. acknowledging', () => {
  const alert = (over: Partial<Message> = {}): Message => ({
    id: 'a', fromDeviceId: 'booth-drinks-1', fromBooth: 'drinks', fromMode: 'order',
    scope: 'all', kind: 'alert', presetCode: 'need_help', createdAt: T0, ackBy: [], ...over,
  })

  /** D1 — the button writes the ack for THIS message and THIS device. */
  test('D1: pressing รับทราบ unions my device id onto that message’s ackBy', async () => {
    const user = userEvent.setup()
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)
    pushFromServer([alert({ id: 'alert-7' })])

    await user.click(screen.getByRole('button', { name: L('comms.ack').th }))

    expect(doc).toHaveBeenCalledWith({ __db: true }, 'messages', 'alert-7')
    expect(updateDoc).toHaveBeenCalledTimes(1)
    expect(updateDoc.mock.calls[0][1]).toStrictEqual({ ackBy: { __arrayUnion: 'hq-macbook' } })
  })

  /**
   * D2 — 🚨 the barrier test. The lesson from the unlock tests: re-acting on a
   * DIFFERENT id is green even when nothing was ever released. So this pushes
   * back the SAME id, now carrying my device in `ackBy`, and requires it gone.
   */
  test('D2: the SAME message, once acked by me, stops being shown to me', async () => {
    const user = userEvent.setup()
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)

    pushFromServer([alert({ id: 'alert-7' })])
    expect(screen.getByRole('status')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: L('comms.ack').th }))
    // Firestore echoes the same document back, now with my id in ackBy.
    pushFromServer([alert({ id: 'alert-7', ackBy: ['hq-macbook'] })])

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  /**
   * D3 — the ack is a set union rather than an append. Firestore's server-side
   * dedupe is ASSUMED from its documented semantics (see header); what is
   * proved here is that the app asks for a union both times, so a double press
   * cannot be what makes `ackBy` grow.
   */
  test('D3: a second ack asks for a union again, never a raw append', async () => {
    const user = userEvent.setup()
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)
    pushFromServer([alert({ id: 'alert-7' })])

    await user.click(screen.getByRole('button', { name: L('comms.ack').th }))
    pushFromServer([alert({ id: 'alert-7' })]) // server has not echoed the ack yet
    await user.click(screen.getByRole('button', { name: L('comms.ack').th }))

    expect(updateDoc).toHaveBeenCalledTimes(2)
    expect(updateDoc.mock.calls.map((c) => c[1])).toStrictEqual([
      { ackBy: { __arrayUnion: 'hq-macbook' } },
      { ackBy: { __arrayUnion: 'hq-macbook' } },
    ])
    expect(arrayUnion).toHaveBeenCalledWith('hq-macbook')
  })

  /** D4 — the toast is a queue, not a dead end: acking reveals the next alert. */
  test('D4: acking the newest alert reveals the one behind it', () => {
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)

    const older = alert({ id: 'old', presetCode: 'low_stock', createdAt: T0 - 5_000 })
    const newer = alert({ id: 'new', presetCode: 'need_help', createdAt: T0 })
    pushFromServer([older, newer])
    expect(screen.getByRole('status').textContent).toContain(L('comms.needHelp').th)

    pushFromServer([older, { ...newer, ackBy: ['hq-macbook'] }])
    expect(screen.getByRole('status').textContent).toContain(L('comms.lowStock').th)
  })

  /**
   * D5 — ack is per-device. Another station clearing the alert must not clear
   * it from mine, or one quick tap anywhere silences everybody.
   */
  test('D5: another device’s ack does not hide the alert from me', () => {
    beDevice('hq-macbook')
    render(<CommsToast booth="photo" />)
    pushFromServer([alert({ id: 'alert-7', ackBy: ['booth-photo-1', 'hq-windows'] })])
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
