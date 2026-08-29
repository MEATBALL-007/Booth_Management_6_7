/**
 * Acceptance criterion — queue-pro-upgrade (Display):
 *
 *   "Display: จัดกึ่งกลางทุกจอ (responsive), 'เตรียมตัว' callout เด่น, skipped ไม่โชว์"
 *
 * The criterion has THREE parts. This file proves TWO of them:
 *
 *   A. จัดกึ่งกลางทุกจอ — the content block is centred on BOTH axes, and every
 *      flex box on the chain between the content and the root agrees to centre it
 *   B. responsive — the screen declares viewport-relative sizing and cannot be
 *      made to scroll sideways by the content it renders
 *   C. "เตรียมตัว" callout เด่น — the first waiting number is a *structurally*
 *      different, larger, highlighted card; the remaining ones are small pills
 *
 * The third part — **skipped ไม่โชว์** — is already proved, and is deliberately
 * NOT repeated here. See `noShowRecall.audit.test.tsx`:
 *   B1  a skipped number appears nowhere in the customer screen (whole-body sweep)
 *   B2  a booth whose only order is skipped shows the no-queue placeholder
 *   B3  the oldest order being skipped does not make it the "เตรียมตัว" next-up
 *   B4  recall puts it back — so the filter is a filter, not a blacklist
 * Duplicating those here would add green tests without adding evidence.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * **NO PIXEL IS MEASURED ANYWHERE IN THIS FILE.** jsdom loads no stylesheet,
 * resolves no Tailwind class, computes no layout, and has no viewport. Every
 * `getBoundingClientRect()` in it returns zeroes. Nothing here can tell you that
 * the screen *looks* centred in a school hall.
 *
 * What IS a real, checkable fact is the **class declared on each element of the
 * ancestor chain**, and that is the only thing asserted. The step from there to
 * "it is centred" rests on Tailwind emitting the flexbox rules it documents —
 * assumed, not proved. Treated honestly this is a regression fence: it catches
 * the centring being *removed* or an *uncentred flex box being introduced
 * mid-chain*, which is the realistic way this criterion breaks.
 *
 * Likewise "responsive" is proved as *`clamp()`/`md:`/`flex-wrap` are declared*,
 * not as behaviour at 768px, and "เด่น" is proved as *a strictly larger declared
 * type size and a different colour token*, not as visual prominence.
 */
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from './domain/types'

const { subs } = vi.hoisted(() => ({ subs: [] as ((o: Order[]) => void)[] }))

vi.mock('./display/chime', () => ({ playChime: vi.fn() }))
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => {
    subs.push(cb)
    return () => {}
  },
  subscribeAllOrders: vi.fn(() => () => {}),
  updateOrderStatus: vi.fn(),
  createOrder: vi.fn(),
}))

import { DisplayScreen } from './screens/DisplayScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

const emit = (orders: Order[]) => act(() => { subs.forEach((cb) => cb(orders)) })

beforeEach(() => { subs.length = 0 })
afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// The class reader, and the axis rule it depends on.
// ─────────────────────────────────────────────────────────────────────────────

const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const has = (el: Element, c: string) => cls(el).includes(c)
const isFlex = (el: Element) => has(el, 'flex') || has(el, 'inline-flex')
const isColumn = (el: Element) => has(el, 'flex-col')

/**
 * Does this flex container centre its children along the HORIZONTAL axis?
 *
 * Direction decides which property governs which axis, and getting this backwards
 * is exactly how a layout check becomes a coin flip:
 *   - `flex-col` — main axis is vertical, so horizontal is the CROSS axis  → `items-*`
 *   - row        — main axis is horizontal                                 → `justify-*`
 * `items-center` therefore centres horizontally on a column and VERTICALLY on a
 * row. Test A0 pins that inversion against hand-built fixtures so this helper
 * cannot quietly degrade into "returns true a lot".
 */
const centersHorizontally = (box: Element) =>
  isColumn(box) ? has(box, 'items-center') : has(box, 'justify-center')

const centersVertically = (box: Element) =>
  isColumn(box) ? has(box, 'justify-center') : has(box, 'items-center')

/** Every flex box from `el` up to and including `root`, innermost first. */
function flexAncestors(el: Element, root: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  let cur = el.parentElement
  while (cur) {
    if (isFlex(cur)) out.push(cur)
    if (cur === root) break
    cur = cur.parentElement
  }
  return out
}

const axes = (boxes: Element[]) => boxes.map((b) => (isColumn(b) ? 'col' : 'row'))

/** The component's own root. NOT `document.body.firstElementChild`, which is
 *  Testing Library's wrapper div and carries no classes at all — every negative
 *  class assertion would pass against its empty string. */
const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement

const div = (className: string) => {
  const d = document.createElement('div')
  d.className = className
  return d
}

const FULL_HOUSE = [
  o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 50, announcedAt: 50 }),
  o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 10 }),
  o({ id: 'w2', queueNumber: 'A3', status: 'waiting', createdAt: 20 }),
  o({ id: 'w3', queueNumber: 'A4', status: 'waiting', createdAt: 30 }),
]

// ─────────────────────────────────────────────────────────────────────────────
// A. จัดกึ่งกลางทุกจอ
// ─────────────────────────────────────────────────────────────────────────────

test('A0: the axis rule itself — items-center and justify-center swap meaning with direction', () => {
  // Fixtures, not the app: if this degrades the sweeps below go blind while
  // staying green, because `[].filter(alwaysTrue)` is also an empty array.
  expect(centersHorizontally(div('flex flex-col items-center'))).toBe(true)
  expect(centersVertically(div('flex flex-col items-center'))).toBe(false)

  // The inversion. `items-center` on a ROW centres vertically, not horizontally.
  expect(centersHorizontally(div('flex items-center'))).toBe(false)
  expect(centersVertically(div('flex items-center'))).toBe(true)

  expect(centersHorizontally(div('flex justify-center'))).toBe(true)
  expect(centersVertically(div('flex flex-col justify-center'))).toBe(true)

  // and a box that declares neither centres nothing
  expect(centersHorizontally(div('flex flex-col gap-4'))).toBe(false)
  expect(centersVertically(div('flex gap-4'))).toBe(false)
})

test('A1: the Display root centres on both axes — and has the vertical room to do it', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  // spine — we are reading a real, populated class list, not ""
  expect(cls(root).length).toBeGreaterThan(5)

  expect(isFlex(root)).toBe(true)
  expect(isColumn(root)).toBe(true)
  expect(centersHorizontally(root)).toBe(true) // items-center on a column
  expect(centersVertically(root)).toBe(true) // justify-center on a column

  // `min-h-screen` is load-bearing and easy to lose: `justify-center` inside a
  // box that hugs its own content centres nothing. Drop it and "centred
  // vertically" becomes false while every class asserted above is still there.
  expect(has(root, 'min-h-screen')).toBe(true)
})

test('A2: every flex box between the serving number and the root centres it horizontally', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)
  const boxes = flexAncestors(screen.getByTestId('serving'), root)

  // spine — pin what the walker actually finds. A root-only check would be one
  // box; this chain is four deep and changes direction in the middle, so the
  // axis rule is genuinely exercised in BOTH of its branches.
  expect(axes(boxes)).toStrictEqual(['col', 'row', 'col', 'col'])
  expect(boxes[boxes.length - 1]).toBe(root)

  const offenders = boxes.filter((b) => !centersHorizontally(b)).map((b) => b.getAttribute('class'))
  expect(offenders).toStrictEqual([])
})

test('A3: the same holds for the เตรียมตัว callout and for the up-next pills', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  const calloutChain = flexAncestors(screen.getByTestId('next-up'), root)
  expect(axes(calloutChain)).toStrictEqual(['col', 'col'])
  expect(calloutChain.filter((b) => !centersHorizontally(b))).toStrictEqual([])

  const pillChain = flexAncestors(screen.getAllByTestId('upnext')[0], root)
  expect(axes(pillChain)).toStrictEqual(['row', 'col', 'col'])
  expect(pillChain.filter((b) => !centersHorizontally(b))).toStrictEqual([])
})

test('A4: the sweep is a sweep — an uncentred box spliced mid-chain is caught', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)
  const serving = screen.getByTestId('serving')

  expect(flexAncestors(serving, root).filter((b) => !centersHorizontally(b))).toStrictEqual([])

  // Wrap the number in a left-aligned flex row, the way a careless refactor
  // would. Nothing about the root changed, so a root-only check stays green.
  const bad = div('flex flex-row justify-start')
  serving.parentElement!.insertBefore(bad, serving)
  bad.appendChild(serving)

  expect(centersHorizontally(root)).toBe(true) // the root is still fine…
  expect(flexAncestors(serving, root).filter((b) => !centersHorizontally(b))).toStrictEqual([bad])
})

// ─────────────────────────────────────────────────────────────────────────────
// B. responsive
// ─────────────────────────────────────────────────────────────────────────────

const CLAMP = /^text-\[clamp\((\d+)px,(\d+)vw,(\d+)px\)\]$/

function clampIn(el: Element): { min: number; vw: number; max: number } | null {
  for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
    for (const c of cls(node)) {
      const m = CLAMP.exec(c)
      if (m) return { min: +m[1], vw: +m[2], max: +m[3] }
    }
  }
  return null
}

test('B1: both headline numbers size off the viewport, with a floor and a ceiling', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)

  for (const testid of ['serving', 'next-up']) {
    const c = clampIn(screen.getByTestId(testid))
    expect(c, `${testid} declares no clamp()`).not.toBeNull()
    // vw scaling is what makes it track the screen instead of a breakpoint…
    expect(c!.vw).toBeGreaterThan(0)
    // …the floor keeps it legible on a phone, the ceiling stops it overflowing a TV
    expect(c!.min).toBeGreaterThanOrEqual(48)
    expect(c!.max).toBeGreaterThan(c!.min)
  }
})

test('B2: the root scales its own padding and gaps at the breakpoint', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const declared = cls(rootOf(container))

  // spine — the base values exist, so the md: ones are an override of something
  expect(declared).toEqual(expect.arrayContaining(['p-8', 'gap-10']))
  expect(declared.filter((c) => c.startsWith('md:')).sort()).toStrictEqual(['md:gap-14', 'md:p-12'])
})

test('B3: every row holding a data-driven list of numbers is allowed to wrap', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([
    o({
      id: 's1', queueNumber: 'A1', status: 'serving',
      // a genuinely hostile order: long unbroken Thai item text
      items: [{
        sku: 'th-tea', name: 'ชาไทยเย็นหวานน้อยไม่ใส่น้ำแข็งเพิ่มวิปครีมและไข่มุก',
        qty: 3, unitPrice: 30, subtotal: 90,
      }],
    }),
    ...FULL_HOUSE.slice(1),
  ])
  const root = rootOf(container)

  // The sideways-scroll bug is a nowrap row whose child count grows with the
  // order list, so that is exactly the set swept: every ROW on the ancestor
  // chain of a repeated queue number. A fixed-arity row cannot overflow by
  // having more orders and is not the hazard.
  const dataRows = new Set<HTMLElement>()
  for (const el of [...screen.getAllByTestId('serving'), ...screen.getAllByTestId('upnext')]) {
    for (const box of flexAncestors(el, root)) if (!isColumn(box)) dataRows.add(box)
  }
  expect(dataRows.size).toBeGreaterThanOrEqual(2) // spine: the walk found real rows
  expect([...dataRows].filter((r) => !has(r, 'flex-wrap')).map((r) => r.getAttribute('class')))
    .toStrictEqual([])

  // the header holds a variable-length booth name beside the badge, so it wraps too
  const header = root.querySelector('header')!
  expect(has(header, 'flex-wrap')).toBe(true)

  // The LIVE badge is the one deliberate non-wrapping row on the screen: a
  // two-part atom that must keep its shape, and it says so with `shrink-0`.
  // Pinned here so it is exempt by its own declaration rather than by this
  // sweep quietly looking the other way.
  const badge = header.querySelector('.shrink-0')!
  expect(isFlex(badge)).toBe(true)
  expect(isColumn(badge)).toBe(false)
  expect(has(badge, 'flex-wrap')).toBe(false)

  // and the one free-text field is width-capped and allowed to break
  const detail = screen.getByText(/ชาไทยเย็น/)
  expect(has(detail, 'break-words')).toBe(true)
  expect(cls(detail).some((c) => c.startsWith('max-w-'))).toBe(true)
})

// ─────────────────────────────────────────────────────────────────────────────
// C. "เตรียมตัว" callout เด่น
// ─────────────────────────────────────────────────────────────────────────────

/** Tailwind's default type scale — only the two steps this screen uses. */
const TW_TEXT: Record<string, number> = { 'text-xl': 20, 'text-2xl': 24 }

const calloutCard = () => screen.getByTestId('next-up').closest('section') as HTMLElement

test('C1: exactly one number is called out; every other waiting number is a pill', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE) // three waiting: A2 (oldest), A3, A4

  expect(screen.getAllByTestId('next-up')).toHaveLength(1)
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toStrictEqual(['A3', 'A4'])
})

test('C2: the callout is the OLDEST waiting number, and it is not repeated among the pills', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)

  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).not.toContain('A2')
})

test('C3: the callout carries the word เตรียมตัว and the pills carry none of it', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)

  expect(calloutCard()).toHaveTextContent('เตรียมตัว')
  for (const pill of screen.getAllByTestId('upnext')) {
    expect(pill.textContent).not.toContain('เตรียมตัว')
  }
})

test('C4: เด่น is structural — the callout is a bordered, tinted, glowing card; the pills are not', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const card = cls(calloutCard())
  const pill = cls(screen.getAllByTestId('upnext')[0])

  // the three things that make it read as a callout rather than another chip
  expect(card.some((c) => c.startsWith('border-2'))).toBe(true)
  expect(card.some((c) => c.startsWith('bg-phantom-yellow/'))).toBe(true)
  expect(card.some((c) => c.startsWith('shadow-'))).toBe(true) // the glow

  // and the pill is none of those — spine: we are comparing a populated list
  expect(pill.length).toBeGreaterThan(4)
  expect(pill.some((c) => c.startsWith('shadow-'))).toBe(false)
  expect(pill.some((c) => c.startsWith('border-2'))).toBe(false)

  // glow is meant to be rationed on this screen; the callout is one of the few
  // places that earns it, so the pills sitting next to it must stay flat.
  expect(container.querySelectorAll('[data-testid="upnext"].glow-y')).toHaveLength(0)
})

test('C5: เด่น is also a size and a colour — the callout beats the biggest pill outright', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)

  const callout = clampIn(screen.getByTestId('next-up'))!
  const pillSizes = cls(screen.getAllByTestId('upnext')[0])
    .map((c) => TW_TEXT[c.replace(/^md:/, '')])
    .filter((n): n is number => n !== undefined)

  // spine — the pill really does declare sizes we know how to read
  expect(pillSizes.length).toBeGreaterThan(0)
  // the callout at its SMALLEST still beats the pill at its LARGEST
  expect(callout.min).toBeGreaterThan(Math.max(...pillSizes))

  // colour: highlight vs muted, not two shades of the same thing
  expect(cls(screen.getByTestId('next-up'))).toContain('text-phantom-yellow')
  expect(cls(screen.getAllByTestId('upnext')[0])).toContain('text-phantom-muted')
})

test('C6: with a single waiting order there is a callout and no pill row at all', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 10 }),
  ])

  // proves the split is a real head/tail split rather than the same list twice
  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
  expect(screen.queryAllByTestId('upnext')).toHaveLength(0)
  expect(screen.queryByText(/คิวถัดไป/)).toBeNull()
})

test('C7: with nothing waiting the callout is absent — it never renders empty', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])

  expect(screen.queryByTestId('next-up')).toBeNull()
  expect(document.body.textContent ?? '').not.toContain('เตรียมตัว')
  expect(screen.getAllByTestId('serving')).toHaveLength(1) // spine: it did render
})
