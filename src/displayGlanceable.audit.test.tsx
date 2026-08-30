/**
 * Acceptance criterion — queue-pro-upgrade (Display):
 *
 *   "Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ
 *    (สี+ไอคอน+ขนาด; ไทยเด่น อังกฤษรอง)"
 *
 * Four things are proved here, each swept rather than spot-checked:
 *
 *   S. the SOURCE fence — no `.en` may be rendered outside the one subordinate
 *      wrapper, and an offender is reported as `DisplayScreen.tsx:<line>`
 *   T. ไทยเด่น อังกฤษรอง — every Latin-script string on the customer screen sits
 *      in an element that declares a strictly smaller size, a lighter weight and
 *      a reduced opacity than the Thai it hangs off
 *   I. สี + ไอคอน แทนคำ — each zone is identifiable by an icon and a colour token
 *      alone, and deleting every subordinate wrapper leaves a screen with no
 *      Latin word on it that still says everything
 *   Z. ขนาด — the serving number is the largest text on the screen at EVERY
 *      viewport width, and it dominates the เตรียมตัว callout on all three
 *      clamp() parameters at once
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * **NO PIXEL IS MEASURED AND NO FONT IS LOADED.** jsdom resolves no Tailwind
 * class, computes no layout, and has no viewport; `getBoundingClientRect()`
 * returns zeroes throughout. Nothing here can tell you the screen is *readable
 * across a school hall*.
 *
 * What IS a checkable fact is the class declared on each element, and that is
 * the only thing asserted. Two further things are assumed, not proved:
 *   - Tailwind emits the type scale it documents (`text-2xl` = 24px, and
 *     `text-[0.7em]` is 0.7 of the inherited size)
 *   - a smaller, lighter, dimmer run of text reads as *secondary* to a human
 * "Glanceable" itself is not measurable in jsdom at all. What is measurable, and
 * is the whole point of this file, is the weaker but real property: **every
 * meaning on the screen is carried by something other than an English word** —
 * a Thai word, an emoji, a colour token, or a size. That is a regression fence
 * against the realistic failure: someone adds an English label and forgets the
 * Thai, or bumps a heading past the queue number.
 *
 * WHY `em` AND NOT A NAMED STEP. The Thai headings change size at `md:`. A
 * subordinate English step (`text-sm md:text-base`) has to restate itself at
 * every breakpoint, and one forgotten override silently inverts the rule at one
 * width only — which no single-viewport test would ever see. `text-[0.7em]` is
 * strictly smaller than whatever it sits in, at every width, by construction.
 * That is what lets "ไทยเด่น อังกฤษรอง" be ONE sweepable rule rather than six
 * hand-tuned exceptions, and it is why T1 checks for an em factor specifically.
 *
 * Related, deliberately not repeated here:
 *   displayCentering.audit.test.tsx  B1 (both numbers declare clamp), C4/C5
 *                                    (the callout out-ranks the pills in size,
 *                                    colour and structure)
 *   noShowRecall.audit.test.tsx      B1–B4 (skipped never reaches the screen)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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
afterEach(() => { cleanup(); vi.restoreAllMocks() })

/**
 * Every fixture below is deliberately free of Latin *words*: item names are Thai
 * and queue numbers are one letter plus digits. That is what lets the sweep say
 * "a run of two or more Latin letters IS a UI label" without an exclusion list.
 * Order data is therefore outside this file's evidence by construction — an
 * English menu item would not be caught here, and is not claimed to be.
 */
const FULL_HOUSE = [
  o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 50, announcedAt: 50,
      items: [{ sku: 'th-tea', name: 'ชาไทยเย็น', qty: 2, unitPrice: 30, subtotal: 60 }] }),
  o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 10 }),
  o({ id: 'w2', queueNumber: 'A3', status: 'waiting', createdAt: 20 }),
  o({ id: 'w3', queueNumber: 'A4', status: 'waiting', createdAt: 30 }),
]

// ─────────────────────────────────────────────────────────────────────────────
// The readers. Every one of them is pinned against hand-built fixtures in S0/T0
// before it is trusted, because a sweep that has gone blind is still green:
// `[].filter(anything)` is also an empty array.
// ─────────────────────────────────────────────────────────────────────────────

const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/** An element's OWN text — direct text-node children only, not descendants. */
const ownText = (el: Element) =>
  Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? '')
    .join('')

const LATIN_WORD = /[A-Za-z]{2,}/
const THAI = /[฀-๿]/

const EM = /^text-\[([0-9.]+)em\]$/
const emFactor = (el: Element): number | null => {
  for (const c of cls(el)) {
    const m = EM.exec(c)
    if (m) return Number(m[1])
  }
  return null
}

const WEIGHTS: Record<string, number> = {
  'font-normal': 400, 'font-medium': 500, 'font-semibold': 600,
  'font-bold': 700, 'font-extrabold': 800,
}
const weightOf = (el: Element): number | null => {
  for (const c of cls(el)) if (c in WEIGHTS) return WEIGHTS[c]
  return null
}

/** Dimmed by `opacity-NN`, or by a TEXT colour carrying an alpha suffix.
 *  Anchored to `text-` on purpose: `bg-phantom-yellow/10` tints a card
 *  background and says nothing about the legibility of the words on it. */
const dimmed = (el: Element) =>
  cls(el).some((c) => /^opacity-\d{1,2}$/.test(c) || /^text-[\w-]+\/\d{1,2}$/.test(c))

/** The rule, in one place: what it means to be the *secondary* half of a pair. */
const subordinate = (el: Element) => {
  const f = emFactor(el)
  return f !== null && f < 1 && weightOf(el) === 400 && dimmed(el)
}

/** Tailwind's default type scale — every step this screen could plausibly use. */
const TW_TEXT: Record<string, number> = {
  'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18, 'text-xl': 20,
  'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36, 'text-5xl': 48, 'text-6xl': 60,
  'text-7xl': 72, 'text-8xl': 96, 'text-9xl': 128,
}
/** Largest NAMED size declared anywhere in the tree, `md:` prefixes included. */
function largestNamedSize(root: Element): { px: number; cls: string } {
  let best = { px: 0, cls: '' }
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const c of cls(el)) {
      const px = TW_TEXT[c.replace(/^md:/, '')]
      if (px !== undefined && px > best.px) best = { px, cls: c }
    }
  }
  return best
}

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

const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement

const span = (className: string, text: string) => {
  const s = document.createElement('span')
  s.className = className
  s.textContent = text
  return s
}

/** Every element whose OWN text carries a Latin word — i.e. every English label. */
const latinBearers = (root: Element) =>
  [root, ...Array.from(root.querySelectorAll('*'))].filter((el) => LATIN_WORD.test(ownText(el)))

/** A short, stable identity for an offender, so a failure names itself. */
const idOf = (el: Element) =>
  `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}">${ownText(el).trim()}`

/** The three states the customer screen can be in. Sweeping only the busy one
 *  would never see `display.noQueue`, and only the drinks booth would never see
 *  the photo booth's own `display.nowServing.photo` wording. */
function eachState(fn: (root: HTMLElement, label: string) => void) {
  const states: [string, 'drinks' | 'photo', Order[]][] = [
    ['drinks · full house', 'drinks', FULL_HOUSE],
    ['drinks · no queue', 'drinks', []],
    ['photo · serving only', 'photo', [o({ id: 'p1', boothId: 'photo', queueNumber: 'B1', status: 'serving' })]],
  ]
  for (const [label, booth, orders] of states) {
    subs.length = 0
    const { container } = render(<DisplayScreen booth={booth} />)
    emit(orders)
    fn(rootOf(container), label)
    cleanup()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// S. the source fence — `.en` may only be rendered inside the one wrapper
// ─────────────────────────────────────────────────────────────────────────────

// `import.meta.url` is NOT a file: URL under Vitest — the module runner serves
// modules over its own protocol, so `fileURLToPath` throws. The repo root is the
// one path that is stable here.
const SRC_PATH = join(process.cwd(), 'src', 'screens', 'DisplayScreen.tsx')
const SRC = readFileSync(SRC_PATH, 'utf8')

/**
 * Blank out comments, keeping every character position and newline, so that a
 * line number computed afterwards still points at the real line. A comment that
 * mentions `.en` renders nothing, and counting it as an offender would push the
 * author to reword prose to satisfy a scanner — which is how a fence starts
 * being routed around instead of obeyed.
 */
const blankComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))

/** Spans of source text lying between `<En ...>` and its `</En>`. */
function enRegions(src: string): [number, number][] {
  const out: [number, number][] = []
  const open = /<En\b[^>]*>/g
  let m: RegExpExecArray | null
  while ((m = open.exec(src))) {
    const close = src.indexOf('</En>', m.index)
    if (close !== -1) out.push([m.index + m[0].length, close])
  }
  return out
}
const inside = (regions: [number, number][], i: number) =>
  regions.some(([a, b]) => i >= a && i < b)
const lineOf = (src: string, i: number) => src.slice(0, i).split('\n').length

test('S0: the source scanner itself — regions are found, and text outside them is outside', () => {
  // Fixtures, not the app. Without this, a regex that matches nothing makes S1
  // report zero offenders and pass while proving absolutely nothing.
  const fixture = 'a{x.en}b<En>{y.en}</En>c<En> {z.en} </En>d'
  const r = enRegions(fixture)
  expect(r).toHaveLength(2)

  const hits = [...fixture.matchAll(/\.en\b/g)].map((m) => m.index!)
  expect(hits).toHaveLength(3)
  expect(hits.map((i) => inside(r, i))).toStrictEqual([false, true, true])

  // an unterminated wrapper opens no region at all, rather than swallowing the file
  expect(enRegions('<En>{q.en}')).toStrictEqual([])
  expect(lineOf('a\nb\nc', 4)).toBe(3)

  // comments are blanked, not deleted — line numbers must survive the pass
  const commented = 'A\n// talks about .en here\n{b.en}\n/* .en\n.en */\nC'
  const blanked = blankComments(commented)
  expect(blanked).toHaveLength(commented.length)
  expect(blanked.split('\n')).toHaveLength(commented.split('\n').length)
  expect([...blanked.matchAll(/\.en\b/g)].map((m) => lineOf(blanked, m.index!))).toStrictEqual([3])
  expect(lineOf(blanked, blanked.indexOf('C'))).toBe(6)
})

test('S1: every English label in DisplayScreen.tsx is rendered through the subordinate wrapper', () => {
  // spine — we read the real file, not an empty string off a wrong path
  expect(SRC).toContain('export function DisplayScreen')

  const code = blankComments(SRC)
  const hits = [...code.matchAll(/\.en\b/g)].map((m) => m.index!)

  // spine — the screen really is bilingual in more than one place, so an empty
  // offender list below means "all of them are wrapped", not "there are none".
  expect(hits.length).toBeGreaterThanOrEqual(6)

  const regions = enRegions(code)
  const offenders = hits
    .filter((i) => !inside(regions, i))
    .map((i) => `DisplayScreen.tsx:${lineOf(code, i)}  ${SRC.split('\n')[lineOf(code, i) - 1].trim()}`)

  expect(offenders).toStrictEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// T. ไทยเด่น อังกฤษรอง
// ─────────────────────────────────────────────────────────────────────────────

test('T0: the prominence readers — em factor, weight, dimming and the subordinate rule', () => {
  const SUB = 'font-kanit text-[0.7em] font-normal opacity-70'
  expect(emFactor(span(SUB, 'x'))).toBe(0.7)
  expect(emFactor(span('text-2xl font-bold', 'x'))).toBeNull() // a named step is not a factor
  expect(weightOf(span(SUB, 'x'))).toBe(400)
  expect(weightOf(span('text-2xl font-semibold', 'x'))).toBe(600)
  expect(weightOf(span('text-2xl', 'x'))).toBeNull()

  expect(dimmed(span('text-phantom-yellow/70', 'x'))).toBe(true)
  expect(dimmed(span('opacity-70', 'x'))).toBe(true)
  expect(dimmed(span('text-phantom-yellow', 'x'))).toBe(false)
  // a tinted CARD is not dimmed TEXT — the callout has exactly this class
  expect(dimmed(span('bg-phantom-yellow/10 border-2', 'x'))).toBe(false)

  expect(subordinate(span(SUB, 'x'))).toBe(true)
  // each of the three conditions is load-bearing on its own
  expect(subordinate(span('text-[1.2em] font-normal opacity-70', 'x'))).toBe(false)
  expect(subordinate(span('text-[0.7em] font-bold opacity-70', 'x'))).toBe(false)
  expect(subordinate(span('text-[0.7em] font-normal', 'x'))).toBe(false)

  expect(ownText(span('a', 'Now Serving'))).toBe('Now Serving')
  expect(LATIN_WORD.test('A1')).toBe(false) // a queue number is not an English word
  expect(LATIN_WORD.test('LIVE')).toBe(true)
  // the Thai range is a literal character class in the source; pin it, because a
  // mangled range would make T2/T3/I3 assert nothing while staying green
  expect(THAI.test('กำลังทำ')).toBe(true)
  expect(THAI.test('Now Serving')).toBe(false)
  expect(THAI.test('🔔')).toBe(false)
})

test('T1: every English string on the customer screen is subordinate — in all three states', () => {
  const found: string[] = []
  const offenders: string[] = []

  eachState((root, label) => {
    const bearers = latinBearers(root)
    // spine, per state — this screen is bilingual everywhere, so a state that
    // turns up no English at all means the sweep broke, not that it passed.
    expect(bearers.length, `${label}: found no English at all`).toBeGreaterThanOrEqual(3)
    for (const el of bearers) {
      found.push(`${label} :: ${idOf(el)}`)
      if (!subordinate(el)) offenders.push(`${label} :: ${idOf(el)}`)
    }
  })

  expect(found.length).toBeGreaterThanOrEqual(11)
  expect(offenders).toStrictEqual([])
})

test('T2: each English run hangs off a Thai element that is bolder and undimmed', () => {
  const offenders: string[] = []

  eachState((root, label) => {
    for (const el of latinBearers(root)) {
      // the nearest ancestor that itself says something in Thai
      let master: Element | null = el.parentElement
      while (master && !THAI.test(ownText(master)) && master !== root) master = master.parentElement

      if (!master || !THAI.test(ownText(master))) {
        offenders.push(`${label} :: NO THAI MASTER :: ${idOf(el)}`)
        continue
      }
      // ไทยเด่น: the Thai declares a real weight, and a bolder one
      const mw = weightOf(master)
      if (mw === null || mw <= 400) offenders.push(`${label} :: MASTER NOT BOLD (${mw}) :: ${idOf(master)}`)
      if (dimmed(master)) offenders.push(`${label} :: MASTER DIMMED :: ${idOf(master)}`)
      // and it sizes itself absolutely, so the 0.7em below it means something
      if (emFactor(master) !== null) offenders.push(`${label} :: MASTER IS RELATIVE :: ${idOf(master)}`)
    }
  })

  expect(offenders).toStrictEqual([])
})

test('T3: Thai is read first — it precedes its English in document order at every pair', () => {
  const offenders: string[] = []

  eachState((root, label) => {
    for (const el of latinBearers(root)) {
      const master = el.parentElement!
      const kids = Array.from(master.childNodes)
      const enAt = kids.indexOf(el)
      const thAt = kids.findIndex((n) => n.nodeType === Node.TEXT_NODE && THAI.test(n.textContent ?? ''))
      if (thAt === -1 || enAt === -1 || thAt > enAt) {
        offenders.push(`${label} :: th@${thAt} en@${enAt} :: ${idOf(master)}`)
      }
    }
  })

  expect(offenders).toStrictEqual([])
})

test('T4: the sweep is a sweep — a bare English span spliced mid-tree is caught', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  // baseline: clean. (This assertion is also what makes this test a canary — it
  // dies with any change that makes the real screen violate the rule.)
  expect(latinBearers(root).filter((el) => !subordinate(el))).toStrictEqual([])

  // the realistic regression: someone adds a heading in English and styles it
  // like everything else around it
  const bad = span('font-kanit text-2xl font-semibold text-phantom-muted', 'Now Serving')
  root.appendChild(bad)

  expect(latinBearers(root).filter((el) => !subordinate(el))).toStrictEqual([bad])

  // and the near-miss: subordinate in two ways out of three is still an offender
  bad.remove()
  const nearly = span('text-[0.7em] font-normal', 'Up Next')
  root.appendChild(nearly)
  expect(latinBearers(root).filter((el) => !subordinate(el))).toStrictEqual([nearly])
})

test('T5: nothing is English-only — every Latin run has Thai beside it, LIVE included', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  // The badge is the one that historically said only "LIVE": the label has had a
  // Thai half (สด) all along and the screen rendered `.en` alone. A green pulsing
  // dot next to an English word is not "อังกฤษรอง" — it is English-only.
  const badge = root.querySelector('header .shrink-0')!
  expect(badge.textContent).toContain('สด')
  expect(badge.textContent).toContain('LIVE')
  expect(latinBearers(badge).every(subordinate)).toBe(true)

  // stated as a rule rather than as one example
  for (const el of latinBearers(root)) {
    const block = el.parentElement!
    expect(THAI.test(block.textContent ?? ''), `no Thai beside ${idOf(el)}`).toBe(true)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// I. สี + ไอคอน แทนคำ
// ─────────────────────────────────────────────────────────────────────────────

test('I1: every zone carries a non-alphabetic signifier — an icon or a live dot', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  const nowServing = screen.getByText(/กำลังทำ/)
  const callout = screen.getByTestId('next-up').closest('section')!.querySelector('h2')!

  expect(ownText(nowServing)).toContain('🔔')
  expect(ownText(callout)).toContain('👉')

  // the LIVE zone's signifier is not a glyph but a pulsing coloured dot, so it
  // is pinned as an element with a colour, a pulse and no text of its own
  const dot = root.querySelector('header .bg-phantom-success.animate-pulse')!
  expect(dot).toBeTruthy()
  expect(dot.textContent).toBe('')

  // spine — the icons live in the Thai element, not in a wrapper of their own,
  // so they cannot be dropped by deleting the English (see I3)
  expect(THAI.test(ownText(nowServing))).toBe(true)
  expect(THAI.test(ownText(callout))).toBe(true)
})

test('I2: the four zones are colour-coded, and no two share a token', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  const servingNum = screen.getByTestId('serving').querySelector('span')!
  const callout = screen.getByTestId('next-up')
  const pill = screen.getAllByTestId('upnext')[0]
  const live = root.querySelector('header .shrink-0 .text-phantom-success')!

  // serving: the hot orange gradient, and the orange glow
  expect(cls(servingNum)).toContain('to-phantom-orange')
  expect(cls(servingNum)).toContain('glow-o')
  // เตรียมตัว: yellow, and the yellow glow
  expect(cls(callout)).toContain('text-phantom-yellow')
  expect(cls(callout)).toContain('glow-y')
  // waiting: muted, and deliberately unglowing
  expect(cls(pill)).toContain('text-phantom-muted')
  expect(cls(pill).some((c) => c.startsWith('glow-'))).toBe(false)
  // live: success green
  expect(cls(live)).toContain('text-phantom-success')

  // and the four are genuinely four, not one token reused — a colour code that
  // repeats itself carries no information at a glance
  const tokens = [servingNum, callout, pill, live].map(
    (el) => cls(el).filter((c) => /^(text-phantom-|to-phantom-)/.test(c)).sort().join('+'),
  )
  expect(new Set(tokens).size).toBe(4)
})

test('I3: delete every subordinate wrapper and the screen still says everything — in Thai', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  // spine: there was English to remove in the first place
  const removed = [root, ...Array.from(root.querySelectorAll('*'))].filter(subordinate)
  expect(removed.length).toBeGreaterThanOrEqual(4)
  for (const el of removed) el.remove()

  // This is the criterion said plainly: a customer who reads no English loses
  // nothing. Not one Latin word survives…
  expect(root.textContent ?? '').not.toMatch(LATIN_WORD)

  // …and every zone is still there, in Thai, with its icon and its number.
  for (const t of ['น้ำปั่น', 'สด', 'กำลังทำ', 'เตรียมตัว', 'คิวถัดไป', '🔔', '👉']) {
    expect(root.textContent, `lost ${t}`).toContain(t)
  }
  expect(screen.getByTestId('serving').textContent).toBe('A1')
  expect(screen.getByTestId('next-up').textContent).toBe('A2')
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toStrictEqual(['A3', 'A4'])
  expect(root.querySelector('header .bg-phantom-success.animate-pulse')).toBeTruthy()
})

// ─────────────────────────────────────────────────────────────────────────────
// Z. ขนาด — the number is the biggest thing on the screen, at every width
// ─────────────────────────────────────────────────────────────────────────────

test('Z0: the size readers — the type scale and the largest-named-size scan', () => {
  const box = document.createElement('div')
  box.appendChild(span('text-lg md:text-3xl', 'a'))
  box.appendChild(span('text-xl', 'b'))
  expect(largestNamedSize(box)).toStrictEqual({ px: 30, cls: 'md:text-3xl' })

  // a tree with no named size at all reports zero rather than throwing, which is
  // what would let Z2 pass vacuously — so Z2 pins the real value, not just ">"
  expect(largestNamedSize(document.createElement('div'))).toStrictEqual({ px: 0, cls: '' })
  expect(clampIn(span('text-[clamp(96px,22vw,320px)]', 'a'))).toStrictEqual({ min: 96, vw: 22, max: 320 })
  expect(clampIn(span('text-2xl', 'a'))).toBeNull()
})

test('Z1: the serving number dominates the เตรียมตัว callout on all three clamp parameters', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)

  const serving = clampIn(screen.getByTestId('serving'))!
  const callout = clampIn(screen.getByTestId('next-up'))!

  // All three at once, which is what makes it a claim about EVERY viewport
  // rather than about one. Beating only the ceiling would still let the callout
  // overtake the number on a phone.
  expect(serving.min).toBeGreaterThan(callout.min)
  expect(serving.vw).toBeGreaterThan(callout.vw)
  expect(serving.max).toBeGreaterThan(callout.max)
})

test('Z2: the serving number floor beats the largest fixed heading on the screen', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(FULL_HOUSE)
  const root = rootOf(container)

  const biggest = largestNamedSize(root)
  // spine — pin what the scan actually finds. `> 0` alone would survive the scan
  // going blind, and the whole comparison would then be against nothing.
  expect(biggest).toStrictEqual({ px: 48, cls: 'md:text-5xl' })

  const serving = clampIn(screen.getByTestId('serving'))!
  expect(serving.min).toBeGreaterThan(biggest.px)

  // the same holds for the callout, which is the only other clamp on the screen
  expect(clampIn(screen.getByTestId('next-up'))!.min).toBeGreaterThan(
    Math.max(...cls(screen.getAllByTestId('upnext')[0]).map((c) => TW_TEXT[c.replace(/^md:/, '')] ?? 0)),
  )
})

test('Z3: English never out-sizes the Thai it sits in — the factor is below one everywhere', () => {
  const factors: number[] = []
  eachState((root) => {
    for (const el of latinBearers(root)) factors.push(emFactor(el)!)
  })

  expect(factors.length).toBeGreaterThanOrEqual(11) // spine: it really swept
  expect(factors.every((f) => f > 0 && f < 1)).toBe(true)
  // one factor, used everywhere — six different ratios would be six chances to
  // get one of them backwards at one breakpoint
  expect(new Set(factors).size).toBe(1)
})
