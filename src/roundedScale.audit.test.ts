/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Radius tokens — ui-overhaul design §2 / §3
 *
 *   §2: "Radius: `sm 10px · md 14px · lg 16px · xl 20px`"
 *   §3: "Tailwind config (`tailwind.config.js`) extend: palette neutrals,
 *        radius scale, fontSize scale (+20%), boxShadow `glow-o`/`glow-y`."
 *
 * Round `_0012` found this gap while closing Neon Clarity and deliberately left
 * it: the config extended `colors` / `fontFamily` / `boxShadow` and **no
 * `borderRadius` at all**, so every screen used Tailwind's default radii while
 * the spec named four specific ones. The Neon Clarity criterion's parenthesis
 * only covers glow and base scale, so it was out of that round's scope.
 *
 * Four claims, and the fourth is a gap rather than a pass:
 *
 *   S. THE PARSER ITSELF — the group every other group rests on. A regex that
 *      matches nothing yields an empty map, and "the empty map has no wrong
 *      value in it" is green. S0 feeds the SAME parser a fixture it must find
 *      and a decoy it must not, so a blind parser cannot report success.
 *   D. DECLARED — the config declares the four tokens, and the numbers are
 *      cross-checked against the spec FILE rather than retyped here, so the
 *      test cannot drift away from the criterion it claims to enforce.
 *   E. EVALUATED — not "is there a borderRadius key" but "what length does
 *      `rounded-lg` actually resolve to". The unit is load-bearing: index.css
 *      sets `html { font-size: 120% }`, so the same four numbers written in rem
 *      would render 20% over spec. E2 evaluates that counterfactual instead of
 *      asserting the choice was right.
 *   G. THE GAP — the spec's scale has four steps; Tailwind's has nine. The four
 *      that were overridden now sit ABOVE two that were not, so `rounded-xl`
 *      (20px) is rounder than `rounded-2xl` (19.2px). That is a real ordering
 *      inversion, it is on the screen today, and no round has decided it.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - `tailwind.config.js` declares exactly the four tokens §2 names, at
 *     exactly the values §2 names, read back out of the spec file.
 *   - Those four are in px, so they resolve to the spec's numbers at any root
 *     font size — evaluated at three root scales, not assumed.
 *   - Which `rounded-*` utilities the app actually uses, counted, and which of
 *     the newly declared tokens have no consumer at all.
 *   - The exact ordering inversion the override creates, computed from the
 *     INSTALLED Tailwind's own defaults rather than from memory of them.
 *
 * 🚨 WHAT IS **NOT** PROVED — no pixel is measured and Tailwind never runs.
 *   No stylesheet is generated and no element is rendered. Every number below
 *   comes from the declared value in the config plus the documented meaning of
 *   `px` and `rem`. Going from "the config says 16px" to "that corner is 16px
 *   on the iPad" assumes Tailwind emits `border-radius` for `rounded-lg` per
 *   its documentation. Nothing here checks the emitted CSS.
 * 🚨 WHETHER THESE ARE THE RIGHT RADII IS NOT TESTED AND NOT CLAIMED. The spec
 *   names four numbers; this file checks the config agrees with the spec. That
 *   the result looks good is a thing a person has to look at.
 * 🚨 G0/G1 ASSERT A STATE THAT IS STILL WRONG — same shape as `idempotency E1`,
 *   `pwa I1`, `alert C5`, `donation T1–T3`. If one of them goes red, somebody
 *   resolved the inversion: that is THE FIX, NOT A REGRESSION. Read this header
 *   and the round's note in docs/autopilot/ before "repairing" anything.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, test } from 'vitest'

// `import.meta.url` is not a file: URL under Vitest — fileURLToPath throws and
// the file reports 0 tests while the suite still says "passed".
const REPO = process.cwd()

const read = (rel: string) => readFileSync(join(REPO, rel), 'utf8')

const SPEC = 'docs/superpowers/specs/2026-08-03-ui-overhaul-design.md'
const CONFIG = 'tailwind.config.js'

/** The four steps the spec names, in the order it names them. */
const SPEC_STEPS = ['sm', 'md', 'lg', 'xl'] as const

// ── the parser, used by every group below ───────────────────────────────────

/** `borderRadius: { sm: '10px', ... }` -> `{ sm: '10px', ... }`. */
function parseRadiusBlock(configText: string): Record<string, string> {
  const block = configText.match(/borderRadius:\s*\{([^}]*)\}/)
  if (!block) return {}
  // The key may be quoted, and for the steps that matter it MUST be: `2xl` and
  // `3xl` are not valid bare identifiers. An unquoted-only pattern here is
  // silently blind to exactly the keys G1 exists to notice — M12 proved it.
  return Object.fromEntries(
    [...block[1].matchAll(/'?([A-Za-z0-9]+)'?\s*:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
  )
}

/**
 * A CSS length in px, at a given root font size. The whole point of the unit
 * choice lives here: `px` ignores `rootPx`, `rem` multiplies by it.
 */
function lengthToPx(value: string, rootPx: number): number {
  const px = value.match(/^(-?[\d.]+)px$/)
  if (px) return Number(px[1])
  const rem = value.match(/^(-?[\d.]+)rem$/)
  if (rem) return Number(rem[1]) * rootPx
  throw new Error(`lengthToPx: unsupported unit in ${JSON.stringify(value)}`)
}

/** The root font size index.css actually sets, in px, evaluated not grepped. */
function rootPxFromCss(): number {
  const css = read('src/index.css')
  const pct = css.match(/html\s*\{[^}]*font-size:\s*([\d.]+)%/)
  if (!pct) throw new Error('index.css no longer sets a root font-size percentage')
  return (Number(pct[1]) / 100) * 16 // 16px = the browser default this scales
}

/** Tailwind's OWN defaults, from the installed package — not from memory. */
function tailwindDefaultRadii(): Record<string, string> {
  const req = createRequire(join(REPO, 'package.json'))
  return req('tailwindcss/defaultTheme').borderRadius as Record<string, string>
}

/** Non-test sources: every screen and primitive, and nothing that tests them. */
function sourceFiles(): string[] {
  const req = createRequire(join(REPO, 'package.json'))
  const { execFileSync } = req('node:child_process') as typeof import('node:child_process')
  return execFileSync('git', ['ls-files', 'src'], { cwd: REPO, encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p))
}

/** Every `rounded-*` token used in the app, counted. Bare `rounded` included. */
function roundedCensus(files: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const file of files) {
    for (const m of read(file).matchAll(/\brounded-([a-z0-9]+)\b/g)) {
      counts[m[1]] = (counts[m[1]] ?? 0) + 1
    }
  }
  return counts
}

// ── S. the parser itself ────────────────────────────────────────────────────

describe('S. ตัวอ่านค่า', () => {
  test('S0: the parser finds what it must find and refuses what it must refuse', () => {
    // Without this, every assertion below is `expect(undefined).toBe(...)` away
    // from being a statement about an empty object. `_0050` M10 and `_0005` M1
    // both showed a blind predicate turning a whole group green at once.
    const fixture = `
      theme: { extend: {
        borderRadius: {
          sm: '1px',
          xl: '2rem',
        },
      } }
    `
    expect(parseRadiusBlock(fixture)).toStrictEqual({ sm: '1px', xl: '2rem' })

    // quoted keys, which `2xl`/`3xl` are forced to use. Before M12 the parser
    // dropped these silently, so G1's "nobody extended the scale" assertion was
    // green no matter what anyone added.
    expect(parseRadiusBlock(`borderRadius: { '2xl': '24px', md: '3px' }`)).toStrictEqual({
      '2xl': '24px',
      md: '3px',
    })

    // a config with no borderRadius at all is exactly the state this round
    // found — the parser must report it as empty, not throw and not invent
    expect(parseRadiusBlock('theme: { extend: { colors: { a: 1 } } }')).toStrictEqual({})

    // the unit evaluator, both branches, and the root reader
    expect(lengthToPx('20px', 19.2)).toBe(20)
    expect(lengthToPx('20px', 16)).toBe(20)
    expect(lengthToPx('1rem', 19.2)).toBeCloseTo(19.2, 5)
    expect(() => lengthToPx('20', 16)).toThrow()
    expect(rootPxFromCss()).toBeCloseTo(19.2, 5)
  })

  test('S1: the file set is the real app, and it is not shrinking', () => {
    // `_0050` M11: a control catches a blind predicate but NOT an input set that
    // quietly shrank. A previous round in this repo shipped a `sourceFiles()`
    // that skipped `src/screens` entirely and the sweep stayed green.
    const files = sourceFiles()
    expect(files.length).toBeGreaterThan(20)
    expect(files).toContain('src/screens/DisplayScreen.tsx')
    expect(files).toContain('src/screens/OrderStation.tsx')
    expect(files).toContain('src/screens/DashboardScreen.tsx')
    expect(files).toContain('src/ui/Button.tsx')
    expect(files.filter((f) => f.startsWith('src/screens/')).length).toBeGreaterThan(3)
    expect(files.filter((f) => /\.test\./.test(f))).toStrictEqual([])
  }, 30_000)
})

// ── D. declared ─────────────────────────────────────────────────────────────

describe('D. ประกาศไว้ใน config', () => {
  test('D0: the spec still names the four radii this file enforces', () => {
    // The numbers are read OUT of the spec rather than retyped, so this file
    // cannot quietly enforce a scale the criterion never asked for. Out of
    // scope forbids editing the spec, which is what makes it a fixed point.
    const line = read(SPEC).match(/Radius:\s*`([^`]+)`/)
    expect(line, 'ui-overhaul §2 no longer states a Radius scale').not.toBeNull()

    const fromSpec = Object.fromEntries(
      [...line![1].matchAll(/(sm|md|lg|xl)\s+(\d+)px/g)].map((m) => [m[1], `${m[2]}px`]),
    )
    expect(fromSpec).toStrictEqual({ sm: '10px', md: '14px', lg: '16px', xl: '20px' })
  })

  test('D1: the config declares exactly those four, at exactly those values', () => {
    const line = read(SPEC).match(/Radius:\s*`([^`]+)`/)!
    const fromSpec = Object.fromEntries(
      [...line[1].matchAll(/(sm|md|lg|xl)\s+(\d+)px/g)].map((m) => [m[1], `${m[2]}px`]),
    )

    expect(parseRadiusBlock(read(CONFIG))).toStrictEqual(fromSpec)
  })

  test('D2: it is an extend, so the rest of Tailwind’s scale survives', () => {
    // `theme.borderRadius` (no extend) would DELETE full/2xl/3xl/DEFAULT and
    // turn `rounded-full` into nothing — 7 call sites, silently square.
    const cfg = read(CONFIG)
    const extendAt = cfg.indexOf('extend:')
    const radiusAt = cfg.indexOf('borderRadius:')
    expect(extendAt).toBeGreaterThan(-1)
    expect(radiusAt).toBeGreaterThan(extendAt)

    // and the keys it does declare are only the spec's four
    expect(Object.keys(parseRadiusBlock(cfg)).sort()).toStrictEqual([...SPEC_STEPS].sort())
  })
})

// ── E. evaluated ────────────────────────────────────────────────────────────

describe('E. ค่าที่เรนเดอร์จริง', () => {
  test('E0: every token resolves to the spec number at every root scale', () => {
    // A declared-value check would pass on `1rem` too. This evaluates.
    const declared = parseRadiusBlock(read(CONFIG))
    const expected = { sm: 10, md: 14, lg: 16, xl: 20 }

    for (const rootPx of [16, rootPxFromCss(), 24]) {
      for (const step of SPEC_STEPS) {
        expect(
          lengthToPx(declared[step], rootPx),
          `rounded-${step} drifts from §2 when the root is ${rootPx}px`,
        ).toBe(expected[step])
      }
    }
  })

  test('E1: the unit is load-bearing — rem would have missed spec by 20%', () => {
    // Not "px is nicer": at the root index.css actually sets, the SAME four
    // numbers expressed in rem land 20% high. This is why the config comment
    // says px on purpose, and why neonClarity B2's px ban excludes radius.
    const rootPx = rootPxFromCss()
    expect(rootPx).toBeGreaterThan(16) // the +20% base scale is switched on

    for (const [step, px] of Object.entries({ sm: 10, md: 14, lg: 16, xl: 20 })) {
      const asRem = `${px / 16}rem`
      expect(lengthToPx(asRem, rootPx), `${step} as rem`).toBeCloseTo(px * 1.2, 5)
      expect(lengthToPx(asRem, rootPx), `${step} as rem hits spec by luck`).not.toBe(px)
    }
  })

  test('E2: index.css is still the only thing setting the root scale', () => {
    // E0/E1 both read the root from index.css. If a second rule set it too,
    // the number they evaluate against would be a guess about cascade order.
    expect(read('src/index.css').match(/font-size:/g)).toHaveLength(1)
  })
})

// ── U. who actually uses them ───────────────────────────────────────────────

describe('U. การใช้งานจริง', () => {
  test('U0: the census sees the app’s real radii', () => {
    // The positive spine. `expect(x).toStrictEqual([])` further down reads the
    // same whether the app is clean or the scanner is blind.
    const census = roundedCensus(sourceFiles())
    expect(Object.keys(census).length).toBeGreaterThan(2)
    expect(census['full']).toBeGreaterThan(0)
    expect(census['lg']).toBeGreaterThan(0)
  }, 30_000)

  test('U1: two of the four tokens have no consumer in the app today', () => {
    // Declaring a token nobody uses is not a bug, but it does mean D1 above
    // proves less than it looks like it proves: changing `sm` or `md` changes
    // NOTHING on any screen right now. Said out loud so nobody reads the tick
    // on this criterion as "the radius system is in use".
    const census = roundedCensus(sourceFiles())
    expect(census['sm']).toBeUndefined()
    expect(census['md']).toBeUndefined()

    // ...while these two are used, so those overrides DO change the screen
    expect(census['lg']).toBeGreaterThan(0)
    expect(census['xl']).toBeGreaterThan(0)
  })
})

// ── G. the gap this override creates ────────────────────────────────────────

describe('G. ช่องว่างที่ยังไม่มีใครตัดสิน', () => {
  test('G0: the scale INVERTS at 2xl — rounded-xl is rounder than rounded-2xl', () => {
    // 🚨 THIS ASSERTS A BROKEN STATE ON PURPOSE. The spec's scale stops at xl;
    // Tailwind's continues to 2xl/3xl in rem. Overriding xl up to 20px lifts it
    // past the untouched 2xl (1rem = 19.2px at this root), so 8 call sites that
    // asked for a ROUNDER corner than their siblings now get a squarer one.
    //
    // Not repaired here: the spec gives no 2xl/3xl value, so every repair is an
    // invented number or a rewrite of 8 presentation call sites — a design
    // decision, and this round was scoped to "declare the tokens §2 names".
    // If this test goes red, someone decided. That is the fix, not a break.
    const rootPx = rootPxFromCss()
    const declared = parseRadiusBlock(read(CONFIG))
    const defaults = tailwindDefaultRadii()

    // the EFFECTIVE 2xl, not Tailwind's default one: an `extend` that declares
    // 2xl overrides it, and reading the default there would keep reporting an
    // inversion that somebody had already resolved. M12 proved that too.
    const xl = lengthToPx(declared['xl'], rootPx)
    const xl2 = lengthToPx(declared['2xl'] ?? defaults['2xl'], rootPx)

    expect(xl).toBe(20)
    expect(xl2).toBeCloseTo(19.2, 5)
    expect(xl, 'the inversion is gone — read this test’s comment').toBeGreaterThan(xl2)

    // and it is not hypothetical: both steps are on screen
    const census = roundedCensus(sourceFiles())
    expect(census['xl']).toBeGreaterThan(0)
    expect(census['2xl']).toBeGreaterThan(0)
  })

  test('G1: 2xl / 3xl / full / DEFAULT are still Tailwind’s, not the spec’s', () => {
    // Pins WHICH steps are outside the declared system, so a later round that
    // extends the scale has to come through here and say so.
    const declared = parseRadiusBlock(read(CONFIG))
    const defaults = tailwindDefaultRadii()

    for (const step of ['2xl', '3xl', 'full', 'DEFAULT', 'none']) {
      expect(declared[step], `${step} is now declared — update G0 and this list`).toBeUndefined()
      expect(defaults[step]).toBeTruthy()
    }

    // the four the spec DOES name are the four that differ from Tailwind.
    // `toBeTruthy` first, or this loop reads the same when NOTHING is declared:
    // `undefined !== '0.125rem'` is true, and M1 showed G1 surviving on it.
    for (const step of SPEC_STEPS) {
      expect(declared[step], `${step} is not declared at all`).toBeTruthy()
      expect(declared[step]).not.toBe(defaults[step])
    }
  })

  test('G2: within the spec’s own four steps the scale still ascends', () => {
    // The inversion is at the seam with Tailwind's scale, not inside §2's.
    const rootPx = rootPxFromCss()
    const declared = parseRadiusBlock(read(CONFIG))
    const px = SPEC_STEPS.map((s) => lengthToPx(declared[s], rootPx))

    expect(px).toStrictEqual([10, 14, 16, 20])
    for (let i = 1; i < px.length; i++) expect(px[i]).toBeGreaterThan(px[i - 1])
  })
})
