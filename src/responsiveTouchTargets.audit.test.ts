/**
 * Acceptance criterion — ui-overhaul, the fifth and last:
 *
 *   "อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ
 *    — ไม่มี horizontal scroll, touch target ≥44px"
 *
 * The criterion names four devices and then, in its own parentheses, says what
 * "อ่านง่าย" is to be judged by: no horizontal scroll, and a 44px touch target.
 * `docs/superpowers/specs/2026-08-03-ui-overhaul-design.md` §4 supplies the rest
 * of the rule set (breakpoints 640/1024, iPad portrait = one stacked column,
 * iPad landscape = two, HQ laptop = a wide grid, `overflow-x` ไม่มี on every
 * page). Those four §4 sentences are the only thing here that "four devices"
 * is turned into, and each is evaluated rather than grepped for.
 *
 * Three groups, three different KINDS of evidence:
 *
 *   T. touch target ≥44px — ARITHMETIC. Every tappable in the source is found by
 *      shape, its size classes are resolved (including the ones its wrapper
 *      component contributes), and a *guaranteed lower bound* on its rendered
 *      height is computed at the real root scale of 19.2px. Not "it has py-2"
 *      — how many pixels, and is that ≥ 44.
 *
 *   X. no horizontal scroll — a CENSUS OF STRUCTURAL CAUSES. See the scope
 *      section: nothing here measures a pixel of overflow, and it must not
 *      pretend to.
 *
 *   R. the four screen sizes — BREAKPOINT COVERAGE. Which column count each of
 *      375 / 768 / 1024 / 1280 actually lands on, evaluated from the prefixes.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 *
 * 🚨 **ไม่มีพิกเซลไหนถูกวัด ไม่มี viewport ไหนถูกตั้ง ไม่มี stylesheet ไหนถูกประเมิน.**
 * jsdom does no layout: `getBoundingClientRect()` returns zeros and
 * `scrollWidth > clientWidth` is `0 > 0` — a test written that way is green for
 * every possible codebase, which is worse than no test. Nothing in this file
 * renders anything. What IS proved is the arithmetic on the values DECLARED in
 * the source, at the root scale `src/index.css` declares.
 *
 * WHAT IS PROVED:
 *   - Every tappable element in `src/` declares a height floor of at least 44px
 *     that does not depend on its content. The bound is deliberately an
 *     UNDER-estimate: it counts `min-height` and padding only, never the text
 *     inside, so a control that passes here passes even when empty.
 *   - Where two class sources set the same padding property (a `<Button>` base
 *     and a call site both saying `py-…`), the SMALLER value is used. Tailwind
 *     resolves that collision by stylesheet order, not by class-attribute order,
 *     so which one wins is not knowable from the call site. Taking the smaller
 *     keeps the bound sound either way.
 *   - Every fixed pixel width declared anywhere in the source is either ≤ the
 *     narrowest target viewport (375px) or sits behind a breakpoint that is
 *     wider than it.
 *   - The breakpoint prefixes in use are all real ones. A typo'd prefix emits
 *     no CSS at all and fails completely silently — R4 is the only thing that
 *     would ever say so.
 *
 * WHAT IS **NOT** PROVED:
 *   - **That nothing overflows.** X is a census of the structural CAUSES of
 *     horizontal scroll (a fixed width wider than the screen, a non-fractional
 *     grid track, a scroller papering over the problem). Text that is simply too
 *     long, a font that loads wider than expected, or an image with intrinsic
 *     size would all overflow without tripping a single assertion here. This is
 *     a proxy. It is named as one.
 *   - **Touch target WIDTH, in general.** T5 sweeps the controls whose label is
 *     a literal glyph or two — the only ones whose width is decided by their own
 *     padding. Every other tappable takes its width from its container
 *     (`w-full`, `flex-1`, a grid track), so a width floor on the element would
 *     not be the binding constraint. That is a judgement, not a measurement.
 *   - **That 44px is comfortable at 120% root.** `min-h-[44px]` is an absolute
 *     constant: unlike every rem utility around it, it does NOT grow with the
 *     +20% base scale. T4 pins that arithmetic. Whether the spec MEANT 44
 *     CSS px or 44 scaled px is a question for a human; this file reads it the
 *     literal way, which is the weaker claim.
 *   - **"อ่านง่าย" itself.** Legibility is not a property of a class list.
 *     Somebody should open all four widths and look.
 *
 * ── เกณฑ์ข้างเคียงที่ไฟล์อื่นถือไว้แล้ว (อ้างอิง ไม่เขียนซ้ำ) ─────────────────
 *   displayClampScale.audit.test.tsx  W1–W4 — the Display queue number really
 *                                     scales with the viewport, evaluated
 *   neonClarity.audit.test.ts         B1 — the root scale is exactly +20%, i.e.
 *                                     the 19.2px this file does its sums in
 *   displayCentering.audit.test.tsx   A2–A4 — the Display column axes
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, test } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.cwd()

/** The narrowest device the criterion names, and the three above it. */
const TARGET_WIDTHS = { mobile: 375, ipadPortrait: 768, ipadLandscape: 1024, laptopHQ: 1280 }

/**
 * Tailwind's default screens. R0 proves the config does not override them —
 * without that, every number below is fiction.
 */
const SCREENS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }

/** Non-responsive variants that may legally prefix a utility. */
const STATE_VARIANTS = new Set([
  'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'visited', 'disabled',
  'checked', 'group-hover', 'group-focus', 'peer-focus', 'peer-checked',
  'first', 'last', 'odd', 'even', 'dark', 'motion-safe', 'motion-reduce', 'print',
])

/**
 * The root scale, from `src/index.css`. Every rem utility is this times its rem
 * value; every `[…px]` utility ignores it entirely. That split is the whole
 * point of T4. neonClarity B1 proves the 120% itself.
 */
const ROOT_PX = 19.2

/** Tailwind's default spacing scale, in rem — the steps this codebase uses. */
const TW_SPACING: Record<string, number> = {
  '0': 0, '0.5': 0.125, '1': 0.25, '1.5': 0.375, '2': 0.5, '2.5': 0.625, '3': 0.75,
  '3.5': 0.875, '4': 1, '5': 1.25, '6': 1.5, '7': 1.75, '8': 2, '9': 2.25, '10': 2.5,
  '11': 2.75, '12': 3, '14': 3.5, '16': 4, '20': 5, '24': 6,
}

/** Read a repo-relative path, proving the read actually landed on a file. */
function read(rel: string): string {
  const p = join(REPO, rel)
  expect(existsSync(p), `${rel} does not exist — the sweep is watching nothing`).toBe(true)
  const src = readFileSync(p, 'utf8')
  expect(src.length, `${rel} read as empty`).toBeGreaterThan(20)
  return src
}

/**
 * Every file a screen is built from. Test files are excluded: their fixtures
 * are full of deliberately-undersized controls, and censusing them would let
 * the census be silenced by moving a violation into a string in a test.
 */
function screenFiles(dir = 'src'): string[] {
  const out: string[] = []
  for (const name of readdirSync(join(REPO, dir)).sort()) {
    const rel = `${dir}/${name}`
    if (statSync(join(REPO, rel)).isDirectory()) {
      if (rel !== 'src/test') out.push(...screenFiles(rel))
      continue
    }
    if (!name.endsWith('.tsx')) continue
    if (/\.test\.tsx$/.test(name)) continue
    out.push(rel)
  }
  return out
}

// ── the scanner ─────────────────────────────────────────────────────────────

type Tag = { file: string; line: number; name: string; text: string; body: string }

/**
 * Every JSX opening tag in a file, with its full text even when it spans lines.
 *
 * The `>` that ends an opening tag has to be found by walking, not by regex:
 * `onClick={() => f()}` contains a `>` and so does every arrow function in every
 * handler. Braces and quotes are tracked so those are skipped. TypeScript
 * generics (`useState<DeviceConfig | null>`) match the tag pattern too; they are
 * harmless because they are neither interactive-named nor carry an onClick.
 */
function openingTags(file: string, src: string): Tag[] {
  const out: Tag[] = []
  const re = /<([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const start = m.index
    let i = re.lastIndex
    let depth = 0
    let quote: string | null = null
    for (; i < src.length; i++) {
      const c = src[i]
      if (quote !== null) {
        if (c === quote) quote = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    const text = src.slice(start, i + 1)
    // the body, for the short-label sweep: nothing for a self-closing tag,
    // otherwise up to the next closing tag of the same name.
    let body = ''
    if (!text.endsWith('/>')) {
      const close = src.indexOf(`</${m[1]}>`, i)
      if (close >= 0) body = src.slice(i + 1, close)
    }
    out.push({ file, line: src.slice(0, start).split(/\r?\n/).length, name: m[1], text, body })
  }
  return out
}

/** Elements that are tappable because of what they ARE. */
const INTRINSIC = new Set(['button', 'input', 'select', 'textarea', 'a'])

function isTappable(t: Tag): boolean {
  return INTRINSIC.has(t.name) || /\bonClick=/.test(t.text)
}

/**
 * The literal class text of a template literal: the parts outside `${…}`, plus
 * the quoted strings INSIDE each `${…}` — a ternary's two branches are both
 * class lists, and taking only one of them would let a whole state's styling
 * escape the sweep. The expression text itself (`active ?`, `VARIANT[variant]`)
 * is not text that reaches the DOM, so it is dropped rather than swept up as
 * imaginary utilities.
 */
function templateClasses(tpl: string): string {
  let out = ''
  let i = 0
  while (i < tpl.length) {
    const open = tpl.indexOf('${', i)
    if (open < 0) return out + ' ' + tpl.slice(i)
    out += ' ' + tpl.slice(i, open)
    let depth = 1
    let j = open + 2
    for (; j < tpl.length && depth > 0; j++) {
      if (tpl[j] === '{') depth++
      else if (tpl[j] === '}') depth--
    }
    for (const m of tpl.slice(open + 2, j - 1).matchAll(/`([^`]*)`|'([^']*)'|"([^"]*)"/g)) {
      out += ' ' + (m[1] !== undefined ? templateClasses(m[1]) : (m[2] ?? m[3] ?? ''))
    }
    i = j
  }
  return out
}

/**
 * The class tokens an opening tag declares. `className` may be a plain string or
 * a braced expression; inside a braced expression every string and template
 * chunk counts, because a ternary's branches are classes too. The braced region
 * is matched by depth so that a later attribute (`aria-label={L('x').th}`)
 * cannot leak its strings in as classes.
 */
function classTokens(tagText: string): string[] {
  const at = tagText.indexOf('className=')
  if (at < 0) return []
  const rest = tagText.slice(at + 'className='.length)
  let raw = ''
  if (rest.startsWith('"')) {
    raw = rest.slice(1, rest.indexOf('"', 1))
  } else if (rest.startsWith('{')) {
    let depth = 0
    let end = rest.length
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '{') depth++
      else if (rest[i] === '}') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }
    const expr = rest.slice(1, end)
    for (const m of expr.matchAll(/`([^`]*)`|'([^']*)'|"([^"]*)"/g)) {
      raw += ' ' + (m[1] !== undefined ? templateClasses(m[1]) : (m[2] ?? m[3] ?? ''))
    }
  }
  return raw.split(/\s+/).filter(Boolean)
}

/** Strip a responsive/state prefix, returning [prefix|null, utility]. */
function splitVariant(tok: string): [string | null, string] {
  const at = tok.lastIndexOf(':')
  return at < 0 ? [null, tok] : [tok.slice(0, at), tok.slice(at + 1)]
}

/** A spacing step or `[Npx]` arbitrary value, in pixels. `null` if neither. */
function lengthPx(value: string): number | null {
  const arb = value.match(/^\[(-?[\d.]+)px\]$/)
  if (arb) return Number(arb[1])
  if (value in TW_SPACING) return TW_SPACING[value] * ROOT_PX
  return null
}

/**
 * A guaranteed lower bound, in px, on the rendered height of an element with
 * these classes — counting `min-height` and vertical padding only, never the
 * content. When one property is set more than once the SMALLER value is taken,
 * because Tailwind decides that collision by stylesheet order and the call site
 * cannot know which way it goes.
 */
function heightFloorPx(tokens: string[]): number {
  const cands = { top: [] as number[], bottom: [] as number[], minH: [] as number[] }
  for (const tok of tokens) {
    const [, util] = splitVariant(tok)
    const m = util.match(/^(min-h|h|p|py|pt|pb)-(.+)$/)
    if (!m) continue
    const px = lengthPx(m[2])
    if (px === null) continue
    if (m[1] === 'min-h' || m[1] === 'h') cands.minH.push(px)
    if (m[1] === 'p' || m[1] === 'py' || m[1] === 'pt') cands.top.push(px)
    if (m[1] === 'p' || m[1] === 'py' || m[1] === 'pb') cands.bottom.push(px)
  }
  const least = (xs: number[]) => (xs.length === 0 ? 0 : Math.min(...xs))
  return Math.max(least(cands.minH), least(cands.top) + least(cands.bottom))
}

/** The same bound on width: `min-width` and horizontal padding only. */
function widthFloorPx(tokens: string[]): number {
  const cands = { left: [] as number[], right: [] as number[], minW: [] as number[] }
  for (const tok of tokens) {
    const [, util] = splitVariant(tok)
    const m = util.match(/^(min-w|w|p|px|pl|pr)-(.+)$/)
    if (!m) continue
    const px = lengthPx(m[2])
    if (px === null) continue
    if (m[1] === 'min-w' || m[1] === 'w') cands.minW.push(px)
    if (m[1] === 'p' || m[1] === 'px' || m[1] === 'pl') cands.left.push(px)
    if (m[1] === 'p' || m[1] === 'px' || m[1] === 'pr') cands.right.push(px)
  }
  const least = (xs: number[]) => (xs.length === 0 ? 0 : Math.min(...xs))
  return Math.max(least(cands.minW), least(cands.left) + least(cands.right))
}

/**
 * Local components that ARE a tappable — a call site of one gets its wrapper's
 * base classes as well as its own. Anything capitalized and clickable that is
 * NOT declared here fails T2 rather than being silently sized at zero.
 */
const WRAPPER: Record<string, { definedIn: string; why: string }> = {
  Button: {
    definedIn: 'src/ui/Button.tsx',
    why: 'The action-button primitive. Its base className is where the size floor has to live: a call site that forgets one inherits it anyway, which is the only version of this rule that survives the next screen somebody writes.',
  },
  ChoiceChip: {
    definedIn: 'src/screens/SetupScreen.tsx',
    why: 'SetupScreen\'s own <button> for ซุ้ม / โหมด / station. It is a tap target with a one-word label, so it declares both a height and a width floor at its definition.',
  },
}

/** The class tokens a wrapper component contributes to every one of its uses. */
function wrapperBase(name: string): string[] {
  const def = WRAPPER[name]
  const tags = openingTags(def.definedIn, read(def.definedIn))
  const own = tags.find((t) => INTRINSIC.has(t.name))
  expect(own, `${name} declares no intrinsic element in ${def.definedIn}`).toBeDefined()
  return classTokens(own!.text)
}

type Tappable = Tag & { at: string; tokens: string[] }

/** Every tappable in the given files, with wrapper classes already merged in. */
function sweepTappables(files: string[], readFile: (f: string) => string): Tappable[] {
  const out: Tappable[] = []
  for (const file of files) {
    for (const t of openingTags(file, readFile(file))) {
      if (!isTappable(t)) continue
      const base = t.name in WRAPPER ? wrapperBase(t.name) : []
      out.push({ ...t, at: `${file}:${t.line}`, tokens: [...base, ...classTokens(t.text)] })
    }
  }
  return out.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1))
}

// ════════════════════════════════════════════════════════════════════════════
// C. the checker itself, pinned to fixtures
// ════════════════════════════════════════════════════════════════════════════

describe('C. ตัวตรวจเอง', () => {
  test('C0: the tag scanner spans lines, survives arrow functions, and reads a template className', () => {
    // Every sweep below is `expect(violations).toStrictEqual([])`, which is
    // exactly as green when the scanner is blind as when the code is clean.
    // This is the test that tells those two apart.
    const fixture = [
      'const x = useState<Config | null>(null)',
      '<button',
      '  onClick={() => go(a > b)}',
      '  className={`px-5 py-3 ${active ? "min-h-[44px]" : "py-1"}`}',
      '  aria-label={L("nav.back").th}',
      '>',
      '  hi',
      '</button>',
      '<input className="min-h-[44px] px-3" />',
      '<Panel className="p-5">x</Panel>',
    ].join('\n')
    const tags = openingTags('f.tsx', fixture)

    // the generic is seen as a tag but is not tappable; Panel has no onClick
    expect(tags.map((t) => t.name)).toStrictEqual(['Config', 'button', 'input', 'Panel'])
    expect(tags.filter(isTappable).map((t) => t.name)).toStrictEqual(['button', 'input'])

    // the opening tag ran from line 2 to line 6 — the `>` inside `a > b` and the
    // one in `=>` were both skipped, and aria-label's string is not a class
    const btn = tags[1]
    expect(btn.line).toBe(2)
    expect(classTokens(btn.text).sort()).toStrictEqual(
      ['min-h-[44px]', 'px-5', 'py-1', 'py-3'].sort(),
    )
    expect(classTokens(btn.text)).not.toContain('nav.back')
    // both branches of the ternary are classes; the condition is not one
    expect(classTokens(btn.text)).not.toContain('active')
    expect(classTokens(btn.text)).not.toContain(':')
    expect(btn.body.trim()).toBe('hi')
    expect(tags[2].body).toBe('') // self-closing
  })

  test('C1: the floor arithmetic, in both directions, at the real root scale', () => {
    // rem steps scale with the 120% root; an arbitrary px value does not.
    expect(lengthPx('3')).toBeCloseTo(14.4, 10) // 0.75rem x 19.2
    expect(lengthPx('[44px]')).toBe(44)
    expect(lengthPx('screen')).toBeNull()
    expect(lengthPx('full')).toBeNull()

    // padding-only: py-3 is 14.4 top + 14.4 bottom
    expect(heightFloorPx(['px-5', 'py-3'])).toBeCloseTo(28.8, 10)
    // min-h wins when it is the larger guarantee
    expect(heightFloorPx(['py-3', 'min-h-[44px]'])).toBe(44)
    // the collision rule: two py- sources, the smaller is assumed to win
    expect(heightFloorPx(['py-3', 'py-2'])).toBeCloseTo(19.2, 10)
    // and it is genuinely a FLOOR, not a guess at the rendered height
    expect(heightFloorPx([])).toBe(0)
    expect(heightFloorPx(['text-lg', 'font-bold'])).toBe(0)
    // a breakpoint-prefixed padding still counts as that property being set
    expect(heightFloorPx(['py-6', 'md:py-8'])).toBeCloseTo(2 * 6 * 0.25 * ROOT_PX, 10)

    expect(widthFloorPx(['px-5'])).toBeCloseTo(48, 10)
    expect(widthFloorPx(['min-w-[44px]', 'px-1'])).toBe(44)
    expect(widthFloorPx(['flex-1', 'w-full'])).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// T. touch target ≥ 44px
// ════════════════════════════════════════════════════════════════════════════

describe('T. touch target ≥ 44px', () => {
  test('T1: spine — the census finds every tappable in the app, by file and line', () => {
    // T3 filters this list. A filter of [] is [], so a scanner that stopped
    // seeing the codebase would pass T3 in silence. This is where that dies.
    expect(sweepTappables(screenFiles(), read).map((t) => t.at)).toStrictEqual([
      'src/App.tsx:29',
      'src/App.tsx:46',
      'src/App.tsx:49',
      'src/comms/AlertButtons.tsx:33',
      'src/comms/AlertButtons.tsx:43',
      'src/comms/AlertButtons.tsx:50',
      'src/comms/BroadcastBar.tsx:28',
      'src/comms/BroadcastBar.tsx:35',
      'src/comms/CommsToast.tsx:40',
      'src/dashboard/PinGate.tsx:27',
      'src/dashboard/PinGate.tsx:41',
      'src/screens/DashboardScreen.tsx:110',
      'src/screens/DashboardScreen.tsx:114',
      'src/screens/DashboardScreen.tsx:117',
      'src/screens/DashboardScreen.tsx:120',
      'src/screens/OrderStation.tsx:101',
      'src/screens/OrderStation.tsx:138',
      'src/screens/OrderStation.tsx:145',
      'src/screens/OrderStation.tsx:167',
      'src/screens/OrderStation.tsx:170',
      'src/screens/OrderStation.tsx:177',
      'src/screens/OrderStation.tsx:185',
      'src/screens/OrderStation.tsx:206',
      'src/screens/OrderStation.tsx:224',
      'src/screens/OrderStation.tsx:227',
      'src/screens/QueuePanel.tsx:81',
      'src/screens/QueuePanel.tsx:90',
      'src/screens/QueuePanel.tsx:101',
      'src/screens/QueuePanel.tsx:102',
      'src/screens/QueuePanel.tsx:103',
      'src/screens/QueuePanel.tsx:104',
      'src/screens/QueuePanel.tsx:117',
      'src/screens/QueuePanel.tsx:118',
      'src/screens/QueuePanel.tsx:132',
      'src/screens/QueuePanel.tsx:143',
      'src/screens/QueuePanel.tsx:145',
      'src/screens/QueuePanel.tsx:146',
      'src/screens/SetupScreen.tsx:18',
      'src/screens/SetupScreen.tsx:65',
      'src/screens/SetupScreen.tsx:78',
      'src/screens/SetupScreen.tsx:99',
      'src/screens/SetupScreen.tsx:107',
      'src/ui/Button.tsx:17',
    ])
  })

  test('T2: census, not whitelist — every clickable wrapper is a declared component', () => {
    // A `<Fancy onClick>` nobody declared would otherwise be measured with an
    // empty class list, i.e. a floor of 0, i.e. a violation reported against the
    // wrong thing. Forcing a declaration is how the sweep stays honest as new
    // components appear.
    const undeclared = sweepTappables(screenFiles(), read)
      .filter((t) => /^[A-Z]/.test(t.name) && !(t.name in WRAPPER))
      .map((t) => `${t.at} <${t.name}>`)
    expect(undeclared).toStrictEqual([])

    // and each declaration says why, in more than a word
    for (const [name, def] of Object.entries(WRAPPER)) {
      expect(existsSync(join(REPO, def.definedIn)), `${name} points at nothing`).toBe(true)
      expect(def.why.length).toBeGreaterThan(60)
    }
    // the base really is read out of the definition, not assumed
    expect(wrapperBase('Button')).toContain('px-5')
    expect(wrapperBase('ChoiceChip')).toContain('min-w-[44px]')
  })

  test('T3: every tappable guarantees at least 44px of height, content or not', () => {
    const short = sweepTappables(screenFiles(), read)
      .map((t) => ({ at: t.at, floor: heightFloorPx(t.tokens) }))
      .filter((t) => t.floor < 44)
      .map((t) => `${t.at} floors at ${t.floor.toFixed(1)}px`)
    expect(short).toStrictEqual([])
  })

  test('T4: the rule is not free — padding alone never reaches 44px here', () => {
    // If every control cleared 44 on its padding, T3 would be satisfied by
    // classes nobody wrote for that reason, and removing every min-h in the app
    // would not turn it red. It would not be a guarantee, just a coincidence.
    // The Button primitive's own padding is the case in point.
    const base = wrapperBase('Button')
    expect(base).toContain('py-3')
    const paddingOnly = heightFloorPx(base.filter((t) => !t.startsWith('min-h-')))
    expect(paddingOnly).toBeCloseTo(28.8, 10)
    expect(paddingOnly).toBeLessThan(44)

    // …so the floor has to come from a declared min-height, and it does — at the
    // primitive, which is what makes it reach every call site.
    expect(base.some((t) => t === 'min-h-[44px]'), 'Button declares no min-height').toBe(true)
    expect(heightFloorPx(base)).toBe(44)

    // 44px is a CONSTANT: it is the one size in this codebase that does not grow
    // with the +20% root. `h-11` (2.75rem) would have been 52.8px, not 44.
    expect(lengthPx('11')).toBeCloseTo(52.8, 10)
    expect(lengthPx('[44px]')).toBe(44)
  })

  test('T5: the controls whose label is a single glyph guarantee 44px of width too', () => {
    // Everything else takes its width from a container (w-full / flex-1 / a grid
    // track), so a width floor on the element would not be the binding
    // constraint. These are the ones where the padding IS the width. Tappables
    // whose body is a JSX expression are excluded — the label is not knowable
    // here — and that exclusion is why this is a pin with a spine, not a proof.
    const glyphs = sweepTappables(screenFiles(), read)
      .filter((t) => t.body !== '' && !t.body.includes('{') && t.body.trim().length <= 2)
      .map((t) => ({ at: t.at, label: t.body.trim(), width: widthFloorPx(t.tokens) }))

    expect(glyphs.map((g) => `${g.at} ${g.label}`)).toStrictEqual([
      'src/screens/OrderStation.tsx:138 −',
      'src/screens/OrderStation.tsx:145 +',
    ])
    for (const g of glyphs) expect(g.width, `${g.at} is only ${g.width}px wide`).toBeGreaterThanOrEqual(44)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// X. no horizontal scroll — census of structural causes, NOT a measurement
// ════════════════════════════════════════════════════════════════════════════

/** Every width-ish utility carrying an explicit px value, with its prefix. */
function sweepFixedWidths(
  files: string[],
  readFile: (f: string) => string,
): { at: string; token: string; prefix: string | null; px: number }[] {
  const out: { at: string; token: string; prefix: string | null; px: number }[] = []
  for (const file of files) {
    readFile(file).split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/(?:^|[\s"'`])((?:[a-z0-9-]+:)?(?:min-w|max-w|w|basis|grid-cols)-\[[^\]]*\])/g)) {
        const [prefix, util] = splitVariant(m[1])
        for (const px of util.matchAll(/(\d+(?:\.\d+)?)px/g)) {
          out.push({ at: `${file}:${i + 1}`, token: m[1], prefix, px: Number(px[1]) })
        }
      }
    })
  }
  return out
}

/** Occurrences of a bare utility, for the "nothing papers over it" census. */
function sweepClass(files: string[], readFile: (f: string) => string, re: RegExp): string[] {
  const out: string[] = []
  for (const file of files) {
    readFile(file).split(/\r?\n/).forEach((line, i) => {
      if (re.test(line)) out.push(`${file}:${i + 1}`)
    })
  }
  return out
}

describe('X. ไม่มี horizontal scroll (census of causes)', () => {
  test('X0: the width scanner, pinned to fixtures — both directions', () => {
    const files = ['a.tsx']
    const src: Record<string, string> = {
      'a.tsx': [
        '<div className="w-[900px]" />',
        '<div className="lg:grid-cols-[1fr_380px] gap-4" />',
        '<div className="max-w-[90vw] min-w-[44px]" />',
        '<div className="w-full max-w-md" />',
      ].join('\n'),
    }
    const hits = sweepFixedWidths(files, (f) => src[f])
    expect(hits.map((h) => `${h.at} ${h.token} ${h.px}`)).toStrictEqual([
      'a.tsx:1 w-[900px] 900',
      'a.tsx:2 lg:grid-cols-[1fr_380px] 380',
      'a.tsx:3 min-w-[44px] 44',
    ])
    expect(hits[1].prefix).toBe('lg')
    expect(hits[0].prefix).toBeNull()
    // a viewport unit is not a fixed width, and named sizes are not px
    expect(hits.map((h) => h.token)).not.toContain('max-w-[90vw]')

    // and it can say "clean" about something clean
    expect(sweepFixedWidths(['b'], () => '<div className="flex flex-wrap gap-2" />')).toStrictEqual([])
  })

  test('X1: spine — every fixed pixel width in the app, pinned', () => {
    expect(sweepFixedWidths(screenFiles(), read).map((h) => `${h.at} ${h.token}`)).toStrictEqual([
      'src/screens/OrderStation.tsx:98 lg:grid-cols-[1fr_380px]',
      'src/screens/OrderStation.tsx:140 min-w-[44px]',
      'src/screens/OrderStation.tsx:147 min-w-[44px]',
      'src/screens/SetupScreen.tsx:20 min-w-[44px]',
    ])
  })

  test('X2: no fixed width is wider than the screen it can appear on', () => {
    // 375 is the narrowest device the criterion names. A fixed width above that
    // is only safe if a breakpoint keeps it off the narrow screens entirely —
    // and then the breakpoint has to be wider than the width itself.
    const NARROWEST = TARGET_WIDTHS.mobile
    const tooWide = sweepFixedWidths(screenFiles(), read)
      .filter((h) => {
        if (h.px <= NARROWEST && h.prefix === null) return false
        const min = h.prefix === null ? 0 : (SCREENS[h.prefix] ?? 0)
        return h.px > Math.max(min, NARROWEST)
      })
      .map((h) => `${h.at} ${h.token} needs ${h.px}px`)
    expect(tooWide).toStrictEqual([])

    // the one width that only clears this because of its prefix, stated out loud
    const cart = sweepFixedWidths(screenFiles(), read).find((h) => h.px === 380)
    expect(cart?.prefix).toBe('lg')
    expect(SCREENS[cart!.prefix!]).toBe(TARGET_WIDTHS.ipadLandscape)
    expect(SCREENS[cart!.prefix!]).toBeGreaterThan(380)
  })

  test('X3: nothing papers over an overflow, and the scanner can see the source', () => {
    // A zero-count assertion on its own is the classic blind sweep, so the
    // positive census comes first: these are the rows that are allowed to wrap,
    // and finding them proves the scanner is reading real files.
    const wrapping = sweepClass(screenFiles(), read, /\bflex-wrap\b/)
    expect(wrapping).toStrictEqual([
      'src/comms/AlertButtons.tsx:31',
      'src/screens/DashboardScreen.tsx:82',
      'src/screens/DisplayScreen.tsx:54',
      'src/screens/DisplayScreen.tsx:77',
      'src/screens/DisplayScreen.tsx:117',
      'src/screens/OrderStation.tsx:74',
      'src/screens/OrderStation.tsx:85',
      'src/screens/OrderStation.tsx:202',
      'src/screens/QueuePanel.tsx:77',
      'src/screens/QueuePanel.tsx:95',
      'src/screens/QueuePanel.tsx:100',
      'src/screens/QueuePanel.tsx:111',
      'src/screens/QueuePanel.tsx:128',
      'src/screens/SetupScreen.tsx:63',
      'src/screens/SetupScreen.tsx:76',
      'src/screens/SetupScreen.tsx:97',
    ])
    // §4 says `overflow-x` ไม่มี. A horizontal scroller, or text forbidden to
    // wrap, would both satisfy a "does it overflow" check while being exactly
    // the thing the criterion rules out.
    expect(sweepClass(screenFiles(), read, /\boverflow-x-/)).toStrictEqual([])
    expect(sweepClass(screenFiles(), read, /\bwhitespace-nowrap\b/)).toStrictEqual([])
  })

  test('X4: every numeric grid is fractional — only the declared track is fixed', () => {
    // `grid-cols-3` is `repeat(3, minmax(0,1fr))` in Tailwind: the `minmax(0,…)`
    // is what stops a long cell from blowing the track out, and it is the reason
    // a 2-column phone grid is not an overflow cause. That is an assumption
    // about Tailwind's output, not something measured here.
    const grids: string[] = []
    for (const file of screenFiles()) {
      read(file).split(/\r?\n/).forEach((line, i) => {
        for (const m of line.matchAll(/(?:^|[\s"'`])((?:[a-z0-9-]+:)?grid-cols-[^\s"'`]+)/g)) {
          grids.push(`${file}:${i + 1} ${m[1]}`)
        }
      })
    }
    expect(grids).toStrictEqual([
      'src/screens/DashboardScreen.tsx:66 grid-cols-2',
      'src/screens/DashboardScreen.tsx:66 md:grid-cols-4',
      'src/screens/DashboardScreen.tsx:77 grid-cols-1',
      'src/screens/DashboardScreen.tsx:77 md:grid-cols-2',
      'src/screens/OrderStation.tsx:98 grid-cols-1',
      'src/screens/OrderStation.tsx:98 lg:grid-cols-[1fr_380px]',
      'src/screens/OrderStation.tsx:99 grid-cols-2',
      'src/screens/OrderStation.tsx:99 sm:grid-cols-3',
    ])
    // exactly one non-numeric track in the whole app, and X2 clears it
    expect(grids.filter((g) => g.includes('grid-cols-['))).toStrictEqual([
      'src/screens/OrderStation.tsx:98 lg:grid-cols-[1fr_380px]',
    ])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// R. the four screen sizes
// ════════════════════════════════════════════════════════════════════════════

/** The widest declared breakpoint that a viewport of `w` actually satisfies. */
function activePrefixes(w: number): string[] {
  return Object.entries(SCREENS)
    .filter(([, min]) => w >= min)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name)
}

/** The column count a `grid-cols-*` set resolves to at a given viewport width. */
function columnsAt(tokens: string[], w: number): number {
  const active = new Set(activePrefixes(w))
  let cols = 1
  let winner = -1
  for (const tok of tokens) {
    const [prefix, util] = splitVariant(tok)
    const m = util.match(/^grid-cols-(\d+|\[.*\])$/)
    if (!m) continue
    if (prefix !== null && !active.has(prefix)) continue
    const min = prefix === null ? 0 : SCREENS[prefix]
    if (min < winner) continue
    winner = min
    cols = m[1].startsWith('[') ? m[1].slice(1, -1).split('_').length : Number(m[1])
  }
  return cols
}

describe('R. สี่ขนาดจอ', () => {
  test('R0: Tailwind does not override the screens, so every width below is real', () => {
    // Every number in R1–R3 and in X2 is Tailwind's DEFAULT breakpoint. A
    // `screens` key in the config would silently redefine all of them, and every
    // "iPad portrait gets one column" claim here would become fiction.
    const cfg = read('tailwind.config.js')
    expect(cfg).toContain('extend')
    expect(cfg, 'the config now sets `screens` — re-derive SCREENS above').not.toMatch(
      /\bscreens\s*:/,
    )
    expect(SCREENS.sm).toBe(640)
    expect(SCREENS.md).toBe(TARGET_WIDTHS.ipadPortrait)
    expect(SCREENS.lg).toBe(TARGET_WIDTHS.ipadLandscape)
    expect(SCREENS.xl).toBe(TARGET_WIDTHS.laptopHQ)
  })

  test('R1: each device the criterion names lands where §4 says it does', () => {
    // §4: mobile <640 = one column · tablet 640–1024 = iPad · desktop >1024 = HQ
    expect(activePrefixes(TARGET_WIDTHS.mobile)).toStrictEqual([])
    expect(activePrefixes(TARGET_WIDTHS.ipadPortrait)).toStrictEqual(['sm', 'md'])
    expect(activePrefixes(TARGET_WIDTHS.ipadLandscape)).toStrictEqual(['sm', 'md', 'lg'])
    expect(activePrefixes(TARGET_WIDTHS.laptopHQ)).toStrictEqual(['sm', 'md', 'lg', 'xl'])

    // the resolver picks the WIDEST matching prefix, not the last token written
    expect(columnsAt(['grid-cols-1', 'md:grid-cols-2'], 375)).toBe(1)
    expect(columnsAt(['grid-cols-1', 'md:grid-cols-2'], 768)).toBe(2)
    expect(columnsAt(['md:grid-cols-4', 'grid-cols-2'], 1280)).toBe(4)
    expect(columnsAt(['grid-cols-1', 'lg:grid-cols-[1fr_380px]'], 1024)).toBe(2)
  })

  test('R2: the Order Station stacks on iPad portrait and splits on iPad landscape', () => {
    // §4, two sentences, evaluated rather than grepped:
    //   "iPad แนวตั้ง: คอลัมน์ซ้อนเป็นแถวเดียว" / "iPad แนวนอน: 2 คอลัมน์ (เมนู+ตะกร้า)"
    const page = openingTags('src/screens/OrderStation.tsx', read('src/screens/OrderStation.tsx'))
      .map((t) => classTokens(t.text))
      .find((c) => c.some((t) => t.includes('grid-cols-[1fr_380px]')))
    expect(page, 'the menu/cart split is gone').toBeDefined()

    expect(columnsAt(page!, TARGET_WIDTHS.mobile)).toBe(1)
    expect(columnsAt(page!, TARGET_WIDTHS.ipadPortrait)).toBe(1)
    expect(columnsAt(page!, TARGET_WIDTHS.ipadLandscape)).toBe(2)
    expect(columnsAt(page!, TARGET_WIDTHS.laptopHQ)).toBe(2)
  })

  test('R3: the HQ dashboard spreads across the laptop and folds down to the phone', () => {
    // §4: "แล็ปท็อป HQ: Dashboard แผ่เต็มความกว้าง (grid หลายคอลัมน์)"
    const grids = openingTags('src/screens/DashboardScreen.tsx', read('src/screens/DashboardScreen.tsx'))
      .map((t) => classTokens(t.text))
      .filter((c) => c.some((t) => /grid-cols-/.test(t)))
    expect(grids.length).toBe(2)

    const [tiles, panels] = grids
    expect(tiles.map((t) => t).filter((t) => t.includes('grid-cols'))).toStrictEqual([
      'grid-cols-2',
      'md:grid-cols-4',
    ])
    expect(columnsAt(tiles, TARGET_WIDTHS.mobile)).toBe(2)
    expect(columnsAt(tiles, TARGET_WIDTHS.ipadPortrait)).toBe(4)
    expect(columnsAt(tiles, TARGET_WIDTHS.laptopHQ)).toBe(4)

    expect(columnsAt(panels, TARGET_WIDTHS.mobile)).toBe(1)
    expect(columnsAt(panels, TARGET_WIDTHS.ipadPortrait)).toBe(2)
    expect(columnsAt(panels, TARGET_WIDTHS.laptopHQ)).toBe(2)
  })

  test('R4: no class carries a prefix Tailwind has never heard of', () => {
    // A misspelt or undefined variant (`tablet:`, `ipad:`, `md :`) compiles to
    // NOTHING. There is no warning, no fallback and no visual difference at the
    // width you happen to be looking at — it is the quietest way for a
    // responsive rule in this codebase to stop existing.
    const prefixes = new Set<string>()
    const unknown: string[] = []
    for (const file of screenFiles()) {
      for (const t of openingTags(file, read(file))) {
        for (const tok of classTokens(t.text)) {
          const [prefix] = splitVariant(tok)
          if (prefix === null) continue
          for (const part of prefix.split(':')) {
            prefixes.add(part)
            if (!(part in SCREENS) && !STATE_VARIANTS.has(part)) unknown.push(`${file}:${t.line} ${tok}`)
          }
        }
      }
    }
    expect(unknown).toStrictEqual([])
    // spine: it really did find prefixes. `xl:` is absent on purpose — `lg:`
    // already covers "desktop >1024", which is every HQ laptop §4 names.
    expect([...prefixes].sort()).toStrictEqual(['disabled', 'focus', 'hover', 'lg', 'md', 'sm'])
  })
})
