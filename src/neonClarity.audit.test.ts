/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Neon Clarity — acceptance criterion (2026-08-03-ui-overhaul-design.md §8):
 *
 *   "ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)"
 *
 * The spec's §2 states the governing rule in a form that can be swept:
 *
 *   > glow เฉพาะ 3 จุดสำคัญ (เลขคิว · ยอดเงิน · ปุ่มหลัก) — ที่เหลือสะอาด
 *   > ใช้ text-shadow/drop-shadow สีส้ม-เหลืองเฉพาะ: เลขคิวที่กำลังทำ ·
 *   > ตัวเลขเงิน (ยอดรวม/ยอดบริจาค) · ปุ่ม action หลัก.
 *   > ห้าม glow พื้น/การ์ด/ข้อความทั่วไป.
 *
 * Three claims, one per phrase of the criterion:
 *
 *   G. glow เฉพาะ 3 จุด — a CENSUS, not a whitelist. Every glow-shaped thing in
 *      every non-test source file must land on one of the spec's three targets
 *      (or be the class definition itself). Nothing may sit in an "ไม่รู้"
 *      state, and every neutral elevation shadow is accounted for separately so
 *      that "not a glow" is a decision on the record rather than a silence.
 *   B. base +20% — the root scale is EVALUATED as arithmetic, not grepped for.
 *      120% of the browser default is 1.2x at every default, and the mechanism
 *      only reaches a page if that page sizes text in units that inherit from
 *      the root. So: no page may set a text size to a fixed pixel constant.
 *   T. สม่ำเสมอ — the two places that define the palette agree with each other,
 *      and no page invents a colour outside the tokens without declaring it.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - Every glow in `src/` is on a queue number, a money figure, or the primary
 *     button. That is a total statement about the source, reached by reading
 *     every file rather than by rendering a sample of screens.
 *   - The declared root scale is exactly +20%, at any browser default.
 *   - No text size anywhere is a pixel constant, so nothing opts out of it.
 *
 * WHAT IS **NOT** PROVED:
 *   - 🚨 NO PIXEL IS MEASURED AND NO STYLESHEET IS EVALUATED. Nothing here
 *     renders; nothing here runs Tailwind. This reads the SOURCE and computes
 *     on the values DECLARED in it. The step from "the root is 120% and every
 *     size is relative" to "the page is 20% bigger" assumes Tailwind emits its
 *     documented rem-based scale — assumed, not proved.
 *   - 🚨 "สวย" is not testable and is not claimed. This proves the glow RATION
 *     and the SCALE, which is what the criterion's parenthetical names. It says
 *     nothing about whether the result is beautiful.
 *   - The clamp() bounds on the two Display numbers are pixel constants at
 *     their extremes. That is the clamp criterion's business (see
 *     `displayClampScale.audit.test.tsx`), not this one — here they count as
 *     viewport-scaled because a viewport unit governs the middle.
 *   - Neutral `shadow-lg` elevation is judged NOT to be a neon glow: it is
 *     Tailwind's black, offset elevation, not the orange-yellow blur §2 rations.
 *     G7 pins every one of them so the judgement is visible and re-checkable.
 *
 * Related, deliberately not repeated here:
 *   displayCentering.audit.test.tsx   C4 — the callout is เด่น structurally,
 *                                     and (since this round) carries no shadow
 *   displayGlanceable.audit.test.tsx  I2 — the four zones are colour-coded
 *   displayClampScale.audit.test.tsx  S1/W1–W4 — the clamps really scale
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, test } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { THEME } from './theme'

const REPO = process.cwd()

/** Read a repo-relative path, proving the read actually landed on a file. */
function read(rel: string): string {
  const p = join(REPO, rel)
  expect(existsSync(p), `${rel} does not exist — the sweep is watching nothing`).toBe(true)
  const src = readFileSync(p, 'utf8')
  expect(src.length, `${rel} read as empty`).toBeGreaterThan(20)
  return src
}

/**
 * Every file a page can be styled from. Test files are excluded: their fixtures
 * are full of deliberately-wrong classes, and censusing them would mean the
 * census could be silenced by moving a violation into a string in a test.
 */
function sourceFiles(dir = 'src'): string[] {
  const out: string[] = []
  for (const name of readdirSync(join(REPO, dir)).sort()) {
    const rel = `${dir}/${name}`
    if (statSync(join(REPO, rel)).isDirectory()) {
      if (rel !== 'src/test') out.push(...sourceFiles(rel))
      continue
    }
    if (!/\.(tsx?|css)$/.test(name)) continue
    if (/\.test\.tsx?$/.test(name) || name === 'vite-env.d.ts') continue
    out.push(rel)
  }
  return out
}

// ── G. glow เฉพาะ 3 จุด ──────────────────────────────────────────────────────

/**
 * The SHAPE of a glow, not a list of its names. A sweep that matched
 * `glow-o|glow-y` by name would go blind the moment someone writes
 * `shadow-[0_0_30px_#fff]`, which is the exact species this criterion forbids.
 */
const GLOW_SHAPE = /\bglow-[a-z]|\bdrop-shadow\b|\btext-shadow\b|\btextShadow\b|\bshadow-\[/

/** Tailwind's named, neutral elevation steps — black and offset, not a glow. */
const ELEVATION = /\bshadow-(?:sm|md|lg|xl|2xl|inner|none)\b/

type Target = 'queue-number' | 'money' | 'primary-button' | 'glow-definition'

/** The three places §2 rations glow to. `glow-definition` is not a place. */
const SPEC_TARGETS: Target[] = ['queue-number', 'money', 'primary-button']

/**
 * The census. Each entry claims one glow site, identified by the file plus a
 * substring that must appear on the hit line itself — NOT by a line number,
 * which would make every entry die on an unrelated edit above it.
 */
const GLOW_CENSUS: { file: string; anchor: string; target: Target; why: string }[] = [
  {
    file: 'src/index.css',
    anchor: '.glow-o {',
    target: 'glow-definition',
    why: 'The orange glow itself. A definition is not a placement — G1 still has to account for every site that applies it.',
  },
  {
    file: 'src/index.css',
    anchor: '.glow-y {',
    target: 'glow-definition',
    why: 'The yellow glow itself. Defined as a text-shadow rather than a filter, so it applies to a glyph and not to the box around it — which is what keeps it off cards by construction.',
  },
  {
    file: 'src/ui/QueueNumber.tsx',
    anchor: 'text-[clamp(96px,22vw,320px)]',
    target: 'queue-number',
    why: 'จุดที่ 1 — the Display variant of the queue number, the "เลขคิวที่กำลังทำ" §2 names first.',
  },
  {
    file: 'src/ui/QueueNumber.tsx',
    anchor: "'text-5xl glow-o'",
    target: 'queue-number',
    why: 'จุดที่ 1 — the card variant of the same primitive, on the operator screens.',
  },
  {
    file: 'src/ui/StatTile.tsx',
    anchor: "accent ? 'text-phantom-yellow glow-y'",
    target: 'money',
    why: 'จุดที่ 2 — the accent tile is the ยอดบริจาค figure. G8 pins that `accent` is passed to exactly one tile, so this glow cannot drift onto a count.',
  },
  {
    file: 'src/ui/Button.tsx',
    anchor: 'primary:',
    target: 'primary-button',
    why: 'จุดที่ 3 — ปุ่ม action หลัก. The ghost and danger variants on the lines below carry no glow, which is what makes this a ration.',
  },
  {
    file: 'src/screens/OrderStation.tsx',
    anchor: 'glow-y font-mono text-3xl',
    target: 'money',
    why: 'จุดที่ 2 — the `cart-total` ยอดรวม on the order screen, which is the other half of the "ยอดรวม/ยอดบริจาค" pair §2 names. The per-line prices beneath it carry no glow.',
  },
  {
    file: 'src/screens/DisplayScreen.tsx',
    anchor: 'glow-y font-mono font-extrabold text-phantom-yellow',
    target: 'queue-number',
    why: 'จุดที่ 1 — the "เตรียมตัว" number. It is a queue number, so the glow belongs on it; the CARD around it is not allowed one, which is the whole point of this round.',
  },
]

type Hit = { at: string; file: string; line: string }

function sweepGlow(files: string[], readFile: (f: string) => string): Hit[] {
  const hits: Hit[] = []
  for (const file of files) {
    readFile(file)
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (GLOW_SHAPE.test(line)) hits.push({ at: `${file}:${i + 1}`, file, line: line.trim() })
      })
  }
  return hits
}

function sweepElevation(files: string[], readFile: (f: string) => string): string[] {
  const hits: string[] = []
  for (const file of files) {
    readFile(file)
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (ELEVATION.test(line)) hits.push(`${file}:${i + 1}`)
      })
  }
  return hits
}

/** A hit is accounted for when exactly one census entry claims it. */
const claimants = (h: Hit) => GLOW_CENSUS.filter((e) => e.file === h.file && h.line.includes(e.anchor))

describe('G. glow เฉพาะ 3 จุด', () => {
  test('G0: the glow scanner, pinned to fixtures — it reports, AND it can say clean', () => {
    // A scanner that returned [] for everything would make G1 pass exactly as
    // loudly as a clean codebase does. Both directions are pinned here, because
    // only one of them distinguishes "clean" from "blind".
    const dirty: Record<string, string> = {
      'a.tsx': [
        'const ok = "rounded-xl bg-phantom-surface"',
        'const bad = "shadow-[0_0_40px_rgba(255,199,44,0.25)]"',
        'const alsoBad = "drop-shadow-2xl"',
        'const named = "shadow-glow-o"',
      ].join('\n'),
      'b.css': ['.card { box-shadow: none; }', '.x { text-shadow: 0 0 9px red; }'].join('\n'),
      'c.tsx': 'const fine = "shadow-lg bg-phantom-surface2"',
    }
    expect(sweepGlow(Object.keys(dirty), (f) => dirty[f]).map((h) => h.at)).toStrictEqual([
      'a.tsx:2',
      'a.tsx:3',
      'a.tsx:4',
      'b.css:2',
    ])

    // A glow named inside a comment is reported on purpose: a class hidden in a
    // string or a comment still ends up in the Tailwind content scan.
    expect(sweepGlow(['x'], () => '// glow-o is applied to the number')).toHaveLength(1)
    // …but the bare English word is not a class and must not fire.
    expect(sweepGlow(['x'], () => '/* glow helper for numbers (queue / money) */')).toHaveLength(0)

    const clean: Record<string, string> = {
      'a.tsx': 'const c = "rounded-2xl border border-phantom-line p-4"',
      'b.css': 'body { @apply bg-phantom-bg; }',
    }
    expect(sweepGlow(Object.keys(clean), (f) => clean[f])).toStrictEqual([])

    // and the elevation scanner, which must be the complement of the above
    expect(sweepElevation(Object.keys(dirty), (f) => dirty[f])).toStrictEqual(['a.tsx:3', 'c.tsx:1'])
    expect(sweepElevation(['x'], () => 'const c = "p-4"')).toStrictEqual([])
  })

  test('G1: every glow in the source lands on one of the three targets', () => {
    const hits = sweepGlow(sourceFiles(), read)
    const unaccounted = hits.filter((h) => claimants(h).length !== 1).map((h) => `${h.at}  ${h.line}`)
    expect(unaccounted).toStrictEqual([])
  })

  test('G2: the census is spine, not decoration — every hit is pinned by file and line', () => {
    // G1 alone cannot tell a clean sweep from a blind one: [] filtered by any
    // predicate is []. This pins what the sweep actually FINDS, so a scanner
    // that stopped seeing the codebase fails here first.
    expect(sweepGlow(sourceFiles(), read).map((h) => h.at)).toStrictEqual([
      'src/index.css:9',
      'src/index.css:10',
      'src/screens/DisplayScreen.tsx:105',
      'src/screens/OrderStation.tsx:160',
      'src/ui/Button.tsx:6',
      'src/ui/QueueNumber.tsx:3',
      'src/ui/QueueNumber.tsx:4',
      'src/ui/StatTile.tsx:5',
    ])
  })

  test('G3: no census entry is fiction — each claims a real line, and only one', () => {
    // A stale entry excuses nothing and hides nothing; it just sits there
    // looking like coverage, which is worse than a gap because nobody re-reads it.
    const hits = sweepGlow(sourceFiles(), read)
    const unmatched = GLOW_CENSUS.filter(
      (e) => !hits.some((h) => h.file === e.file && h.line.includes(e.anchor)),
    ).map((e) => `${e.file} :: ${e.anchor}`)
    expect(unmatched).toStrictEqual([])

    for (const e of GLOW_CENSUS) {
      expect(existsSync(join(REPO, e.file)), `${e.file} declared but absent`).toBe(true)
      expect(e.why.length, `${e.file} :: ${e.anchor} has no reason`).toBeGreaterThan(60)
    }
  })

  test('G4: every target is one the spec names, and all three are really used', () => {
    for (const e of GLOW_CENSUS) {
      expect([...SPEC_TARGETS, 'glow-definition']).toContain(e.target)
    }
    // A census whose entries all fell into one bucket would satisfy G1 while
    // saying nothing. Each of the spec's three places must be occupied.
    const used = new Set(GLOW_CENSUS.map((e) => e.target))
    for (const t of SPEC_TARGETS) expect(used, `nothing glows as ${t}`).toContain(t)

    // …and the exact distribution, as a canary. "Every bucket is non-empty" is
    // too weak on its own: three sites claim `queue-number`, so two of them
    // could be retargeted to anything and the check above would still pass.
    // (M6 of the mutation run proved exactly that, and this line is the fix.)
    // Retargeting or adding a glow must force a re-read of the whole census.
    const perTarget: Record<string, number> = {}
    for (const e of GLOW_CENSUS) perTarget[e.target] = (perTarget[e.target] ?? 0) + 1
    expect(perTarget).toStrictEqual({
      'queue-number': 3,
      money: 2,
      'primary-button': 1,
      'glow-definition': 2,
    })
  })

  test('G5: no card, surface or body text glows — the forbidden half of the rule', () => {
    // §2 forbids by name: พื้น / การ์ด / ข้อความทั่วไป. The structural tell of a
    // card is a background or a border on the same element as the glow.
    const CARDLIKE = /\b(?:bg-|border(?:-2)?\b|rounded-)/
    const onACard = sweepGlow(sourceFiles(), read)
      .filter((h) => h.file !== 'src/index.css')
      .filter((h) => CARDLIKE.test(h.line) && !/\btext-|font-mono/.test(h.line))
      .map((h) => h.at)
    expect(onACard).toStrictEqual([])

    // spine for the matcher above — it must actually recognise a glowing card
    expect(CARDLIKE.test('<section className="rounded-3xl border-2 shadow-[0_0_40px_#ffc72c]">')).toBe(true)
  })

  test('G6: the glow colours are the brand orange and yellow, not a new hue', () => {
    // §2 says สีส้ม-เหลือง specifically. A blue glow would pass every test above.
    const css = read('src/index.css')
    const rgba = [...css.matchAll(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
    ])
    const hex = (c: number[]) =>
      '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()

    expect(rgba.map(hex)).toStrictEqual([THEME.orange.toUpperCase(), THEME.yellow.toUpperCase()])
  })

  test('G7: every neutral elevation shadow is on the record, and none is coloured', () => {
    // Judged not-a-glow (see SCOPE). Pinned so the judgement is visible: if a
    // fourth appears, or one of these grows a colour, this fires.
    const files = sourceFiles()
    expect(sweepElevation(files, read)).toStrictEqual([
      'src/App.tsx:32',
      'src/App.tsx:42',
      'src/comms/CommsToast.tsx:35',
    ])
    // a named step takes no colour argument, so these cannot BE glows; the
    // arbitrary form that can is already caught by GLOW_SHAPE (G0 pins both).
    expect(sweepGlow(files, read).map((h) => h.at)).not.toContain('src/App.tsx:32')
  })

  test('G8: the money glow is on the donation figure and nothing else', () => {
    // StatTile glows only when `accent` is passed. If a future round accents a
    // COUNT, the glow silently leaves its allowed target while G1 stays green,
    // because the census entry lives in StatTile and never moves.
    const dash = read('src/screens/DashboardScreen.tsx')
    const accented = dash
      .split(/\r?\n/)
      .map((line, i) => ({ line, at: `src/screens/DashboardScreen.tsx:${i + 1}` }))
      .filter(({ line }) => /<StatTile[^>]*\baccent\b/.test(line))

    expect(accented.map((a) => a.at)).toStrictEqual(['src/screens/DashboardScreen.tsx:68'])
    expect(accented[0].line).toContain('net-donation')
  })
})

// ── B. base +20% ────────────────────────────────────────────────────────────

/** The root scale, as a ratio, read out of whatever unit it is declared in. */
function rootScale(css: string): number | null {
  const m = css.match(/(?:html|:root)\s*\{[^}]*font-size:\s*([\d.]+)(%|rem|em)/)
  if (!m) return null
  const n = Number(m[1])
  return m[2] === '%' ? n / 100 : n
}

describe('B. base +20%', () => {
  test('B0: the root-scale reader, pinned to fixtures', () => {
    expect(rootScale('html { font-size: 120%; }')).toBe(1.2)
    expect(rootScale(':root { color: red; font-size: 1.2rem; }')).toBe(1.2)
    expect(rootScale('html { font-size: 100%; }')).toBe(1)
    // a size on something that is not the root scales nothing
    expect(rootScale('body { font-size: 120%; }')).toBeNull()
    expect(rootScale('html { color: red; }')).toBeNull()
    // px is not a scale — it is a constant, and B1 must be able to see that
    expect(rootScale('html { font-size: 19.2px; }')).toBeNull()
  })

  test('B1: the declared root scale is exactly +20%, at any browser default', () => {
    const css = read('src/index.css')
    const scale = rootScale(css)
    expect(scale, 'no root font-size is declared at all').not.toBeNull()

    // The formula, evaluated — not the string, found. A `font-size: 96%` would
    // contain the same words and shrink the entire system.
    for (const browserDefault of [16, 14, 12, 20, 24]) {
      expect(browserDefault * scale!).toBeCloseTo(browserDefault * 1.2, 10)
    }
    expect(16 * scale!).toBeCloseTo(19.2, 10)

    // exactly one root declaration: a second one would silently win or lose
    expect(css.match(/font-size:/g)).toHaveLength(1)
  })

  test('B2: nothing in the Tailwind config overrides the scale back to constants', () => {
    // The root scale only reaches a utility if that utility is expressed in rem.
    // Tailwind's DEFAULT fontSize and spacing scales are; an `extend` that
    // replaced them with px values would defeat the +20% for every page at once.
    const cfg = read('tailwind.config.js')
    const extendKeys = [...cfg.matchAll(/^ {6}([A-Za-z]+): \{/gm)].map((m) => m[1])

    // canary: this is the whole of what the config extends today. When a round
    // adds a scale here, this fires and forces the check below to be re-read.
    expect(extendKeys).toStrictEqual(['colors', 'fontFamily', 'borderRadius', 'boxShadow'])

    // Re-read as the canary demanded, when borderRadius arrived: it is px on
    // purpose and it is NOT added to the list below. The +20% exists so text
    // and touch targets grow together; §2 scopes it to ตัวหนังสือ/ปุ่ม/สเปซ/ตัวเลข
    // and names radius separately in literal px. A corner that grew 20% with the
    // root would not be the 10/14/16/20 the spec asks for. The ban below is
    // about scales that MUST ride the root — radius is not one of them.
    for (const key of ['fontSize', 'spacing', 'lineHeight']) {
      const block = cfg.match(new RegExp(`${key}: \\{([^}]*)\\}`))
      if (!block) continue
      expect(block[1], `${key} is overridden in px, which ignores the root scale`).not.toMatch(/\d(?:px)\b/)
    }
  })

  test('B3: no page sizes text with a pixel constant, so nothing opts out', () => {
    const violations: string[] = []
    for (const file of sourceFiles()) {
      read(file)
        .split(/\r?\n/)
        .forEach((line, i) => {
          for (const size of textSizes(line)) {
            if (classifySize(size) === 'fixed') violations.push(`${file}:${i + 1}  ${size}`)
          }
        })
    }
    expect(violations).toStrictEqual([])
  })

  test('B4: the +20% is arithmetic on the steps the pages actually use', () => {
    // Every named step is `n rem`, so the rendered pixel size is n x root. This
    // is the step from "120% is declared" to "the text is 20% bigger", done as
    // a calculation on real values rather than assumed from the word "scale".
    const root = 16 * rootScale(read('src/index.css'))!
    for (const [step, rem] of Object.entries(TW_TEXT_REM)) {
      expect(rem * root, `${step} did not scale`).toBeCloseTo(rem * 16 * 1.2, 10)
    }
    // and concretely, on two steps this codebase leans on
    expect(TW_TEXT_REM['3xl'] * root).toBeCloseTo(36, 10) // cart-total: 30px -> 36px
    expect(TW_TEXT_REM['5xl'] * root).toBeCloseTo(57.6, 10) // queue card: 48px -> 57.6px
  })

  test('B5: the size scanner and its classifier, pinned to fixtures', () => {
    expect(textSizes('className="font-mono text-3xl mt-1 text-phantom-yellow"')).toStrictEqual(['3xl'])
    expect(textSizes('className="text-lg md:text-2xl text-phantom-text/80"')).toStrictEqual(['lg', '2xl'])
    expect(textSizes('className="text-[0.7em] opacity-70"')).toStrictEqual(['[0.7em]'])
    // colours and alignment are not sizes and must not be swept up as unknowns
    expect(textSizes('className="text-center text-transparent text-phantom-muted"')).toStrictEqual([])
    // an ARBITRARY colour is the trap: `text-[#ff0000]` is not a 0px font
    expect(textSizes('className="text-[#ff0000] text-[0.7em]"')).toStrictEqual(['[0.7em]'])
    expect(textSizes('className="text-[rgba(255,199,44,0.4)]"')).toStrictEqual([])

    expect(classifySize('3xl')).toBe('named')
    expect(classifySize('[0.7em]')).toBe('relative')
    expect(classifySize('[clamp(96px,22vw,320px)]')).toBe('viewport')
    expect(classifySize('[19px]')).toBe('fixed')
    expect(classifySize('[clamp(56px,140px)]')).toBe('fixed')
  })
})

/** Tailwind's default type scale, in rem. The only reason +20% works at all. */
const TW_TEXT_REM: Record<string, number> = {
  xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25, '2xl': 1.5, '3xl': 1.875,
  '4xl': 2.25, '5xl': 3, '6xl': 3.75, '7xl': 4.5, '8xl': 6, '9xl': 8,
}

/**
 * `text-[…]` is overloaded: it sets a size OR a colour. A colour has no size to
 * classify, and calling one a pixel constant would make B3 fire on a palette
 * change — a false alarm that gets a real sweep switched off.
 */
const ARBITRARY_COLOUR = /^\[(?:#|rgba?\(|hsla?\(|var\()/

/** Text-size utilities on a line, breakpoint prefixes stripped. */
function textSizes(line: string): string[] {
  const out: string[] = []
  for (const m of line.matchAll(/(?:^|[\s"'`{])(?:(?:sm|md|lg|xl|2xl):)?text-(\[[^\]]*\]|[a-z0-9]+)/g)) {
    const tok = m[1]
    if (ARBITRARY_COLOUR.test(tok)) continue
    if (tok.startsWith('[') || tok in TW_TEXT_REM) out.push(tok)
  }
  return out
}

function classifySize(tok: string): 'named' | 'relative' | 'viewport' | 'fixed' {
  if (!tok.startsWith('[')) return 'named'
  // viewport first: a clamp() carries px bounds AND a vw term, and the vw term
  // is the one that makes it scale. NB: the unit is preceded by a digit, so it
  // has no \b in front of it — `\bvw\b` would match nothing and call every
  // clamp a fixed constant.
  if (/\d(?:vw|vh|vmin|vmax)\b/.test(tok)) return 'viewport'
  if (/r?em\b|%/.test(tok)) return 'relative'
  return 'fixed'
}

// ── T. สม่ำเสมอ — one palette, declared once ────────────────────────────────

describe('T. สม่ำเสมอ', () => {
  test('T0: theme.ts and the Tailwind palette are the same palette', () => {
    // Two sources of truth for one set of tokens is how a system stops looking
    // like one system. Every THEME entry must be the phantom-* of the same name.
    const cfg = read('tailwind.config.js')
    const palette = Object.fromEntries(
      [...cfg.matchAll(/'phantom-([a-z0-9]+)': '([^']+)'/g)].map((m) => [m[1], m[2]]),
    )
    expect(Object.keys(palette).length).toBeGreaterThan(5)

    for (const [name, value] of Object.entries(THEME)) {
      expect(palette[name], `THEME.${name} has no phantom-${name}`).toBe(value)
    }
    // known asymmetry, pinned rather than left implicit: the config carries one
    // token THEME does not. If THEME grows or shrinks, this says so.
    expect(Object.keys(palette).filter((k) => !(k in THEME))).toStrictEqual(['danger'])
  })

  test('T1: no page invents a colour — literal colours are censused', () => {
    const DECLARED_LITERAL_COLOUR: Record<string, string> = {
      'src/ui/QueueNumber.tsx':
        'The lighter stop of the queue-number gradient (#FFD65a -> phantom-orange). It is a highlight of the yellow token rather than a fourth brand colour, and displayGlanceable I2 pins the pair as this zone\'s colour code.',
    }
    const found: Record<string, string[]> = {}
    for (const file of sourceFiles()) {
      if (file.endsWith('.css') || file === 'src/theme.ts') continue // the definitions themselves
      read(file)
        .split(/\r?\n/)
        .forEach((line, i) => {
          const m = line.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([\d\s,.]+\)/g)
          if (m) (found[file] ??= []).push(`${i + 1}: ${m.join(' ')}`)
        })
    }
    expect(Object.keys(found).sort()).toStrictEqual(Object.keys(DECLARED_LITERAL_COLOUR).sort())
    for (const reason of Object.values(DECLARED_LITERAL_COLOUR)) {
      expect(reason.length).toBeGreaterThan(60)
    }
    // spine: the scanner really does find that one, rather than finding nothing
    expect(found['src/ui/QueueNumber.tsx']).toStrictEqual(['6: #FFD65a'])
  })

  test('T2: the census reads every page, not a sample of them', () => {
    // "ทุกหน้า" is the load-bearing word in the criterion. If the file walk
    // missed a screen, G1/B3/T1 would all pass while saying nothing about it.
    const files = sourceFiles()
    for (const page of [
      'src/App.tsx',
      'src/index.css',
      'src/screens/DashboardScreen.tsx',
      'src/screens/DisplayScreen.tsx',
      'src/screens/OrderStation.tsx',
      'src/screens/QueuePanel.tsx',
      'src/screens/SetupScreen.tsx',
      'src/dashboard/PinGate.tsx',
      'src/comms/AlertButtons.tsx',
      'src/comms/BroadcastBar.tsx',
      'src/comms/CommsToast.tsx',
      'src/comms/PresenceBoard.tsx',
      'src/order/QrCode.tsx',
      'src/ui/Button.tsx',
      'src/ui/Chip.tsx',
      'src/ui/Panel.tsx',
      'src/ui/QueueNumber.tsx',
      'src/ui/StatTile.tsx',
    ]) {
      expect(files, `${page} is outside the census`).toContain(page)
    }
    // and no test file leaked in — their fixtures are full of wrong classes
    expect(files.filter((f) => /\.test\./.test(f))).toStrictEqual([])
  })
})
