/**
 * Diff-scope audit — spec `2026-08-03-ui-overhaul-design.md` §8:
 *
 *   "Firestore/logic ไม่มีการเปลี่ยนแปลง (diff เฉพาะ presentation + Tailwind config + src/ui)"
 *
 * and its §7 gloss, which is the sentence that actually defines the words:
 *
 *   "Firestore/logic ไม่แตะ — เปลี่ยนแค่ presentation. ไม่แก้ repo, metrics, cart logic, comms logic"
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE — read before trusting a green run:
 *
 *   The criterion itself is a claim about a *git range* ("the overhaul's diff"), and a
 *   claim about history cannot be pinned by a test. A test that asserted "these files
 *   never change" would freeze the repo and block every legitimate future edit — the
 *   2026-08-17 audit round said so explicitly and it was right. The history half of the
 *   criterion is therefore audited by hand, once, and written down:
 *       docs/autopilot/2026-08-22-ui-overhaul-diff-scope-audit.md
 *
 *   What IS pinnable is the *reason* the criterion exists: the overhaul must not be able
 *   to reach Firestore or business logic. That is a layering invariant, it is true today,
 *   and it should stay true forever — so it is a fair thing to hold a future round to:
 *
 *     - a restyle cannot become a write   → only lib/firebase.ts + *Repo.ts import firebase
 *     - a restyle cannot leak into logic  → no domain module carries markup or a class
 *     - logic never depends on the skin   → no domain module imports src/ui|screens|i18n
 *
 *   These read *source text*, not a rendered app: a class assembled at runtime, or a
 *   Firestore call reached through an alias this file does not know about, is invisible
 *   here. The sweep is a tripwire on the obvious routes, not a proof of isolation.
 *
 * Tests marked GAP: assert that a known, deliberately-unclosed gap is still open, so its
 * status cannot go quiet. When one turns red someone has closed the gap — delete it.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, test, expect } from 'vitest'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
}

/** repo-relative, forward-slashed — so failure messages are clickable on any OS */
const rel = (abs: string) => relative(ROOT, abs).split('\\').join('/')

/** Every hand-written source file that ships. A test file cannot change what the app does. */
const SHIPPED = walk(join(ROOT, 'src'))
  .map(rel)
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .filter((f) => f !== 'src/test/setup.ts') // vitest bootstrap, never bundled
  .filter((f) => f !== 'src/vite-env.d.ts') // ambient types, no code
  .sort()

/**
 * The three buckets the criterion allows, plus the one it protects.
 *
 * Membership is by the ROLE the module plays, not by the directory it happens to sit in.
 * That reading is forced by the spec itself: §7 P2 says the overhaul restyles every screen
 * one at a time, so `src/screens/` must be touchable; and `src/order/QrCode.tsx` is a
 * PromptPay <img> with a className and nothing else. A path-literal reading would make the
 * spec contradict its own plan. See §2 of the audit doc for the full argument.
 */
const PRESENTATION = [
  'src/App.tsx',
  'src/main.tsx',
  'src/comms/AlertButtons.tsx',
  'src/comms/BroadcastBar.tsx',
  'src/comms/CommsToast.tsx',
  'src/comms/PresenceBoard.tsx',
  'src/dashboard/PinGate.tsx',
  'src/i18n/BiLabel.tsx',
  'src/i18n/labels.ts',
  'src/order/QrCode.tsx',
  'src/screens/DashboardScreen.tsx',
  'src/screens/DisplayScreen.tsx',
  'src/screens/OrderStation.tsx',
  'src/screens/QueuePanel.tsx',
  'src/screens/SetupScreen.tsx',
]
const UI = ['src/ui/Button.tsx', 'src/ui/Chip.tsx', 'src/ui/Panel.tsx', 'src/ui/QueueNumber.tsx', 'src/ui/StatTile.tsx']
/** the "Tailwind config" bucket: design tokens, wherever they are declared */
const TOKENS = ['src/index.css', 'src/theme.ts']

/** Everything the criterion protects. Derived, not typed out, so it cannot drift silently. */
const DOMAIN = SHIPPED.filter((f) => ![...PRESENTATION, ...UI, ...TOKENS].includes(f))

type Site = { file: string; line: number; text: string }

/** Rules take (file, source) so a synthetic fixture can be fed to the same code — see "teeth". */
function scan(files: readonly { file: string; src: string }[], re: RegExp): Site[] {
  return files.flatMap(({ file, src }) =>
    src
      .split(/\r?\n/)
      .flatMap((text, i) => (re.test(text) ? [{ file, line: i + 1, text: text.trim() }] : [])),
  )
}

const load = (files: readonly string[]) =>
  files.map((file) => ({ file, src: readFileSync(join(ROOT, file), 'utf8') }))

const show = (sites: Site[]) => sites.map((s) => `${s.file}:${s.line}  ${s.text}`).join('\n')

/** A Tailwind class attribute or a project colour token — the fingerprint of styling. */
const STYLING = /className=|phantom-|\bglow-[oy]\b/
/** A closing lowercase HTML tag. TS generics (`useState<string>`) can never produce one. */
const MARKUP = /<\/[a-z]/
/** Any route to Firestore: the SDK itself, or the one module that holds the handle. */
const FIRESTORE = /^\s*import .*from '(firebase\/[a-z]+|[./]*lib\/firebase)'/
/** An import reaching into the skin. */
const SKIN_IMPORT = /^\s*import .*from '[./]*(ui|screens|i18n)\//

describe('bucket census (a sweep over the wrong file list proves nothing)', () => {
  test('A1: every shipped source file is classified into exactly one bucket', () => {
    const named = [...PRESENTATION, ...UI, ...TOKENS]
    const missing = named.filter((f) => !SHIPPED.includes(f))
    expect(missing, 'these bucket entries no longer exist — fix the list, do not delete the rule').toStrictEqual([])
    const dupes = named.filter((f, i) => named.indexOf(f) !== i)
    expect(dupes, 'a file is in two buckets').toStrictEqual([])
    // DOMAIN is the remainder, so nothing can be unclassified; this states it for the reader.
    expect([...named, ...DOMAIN].sort()).toStrictEqual(SHIPPED)
  })

  test('A2: DOMAIN holds every module the spec names by role', () => {
    // §7: "ไม่แก้ repo, metrics, cart logic, comms logic" — plus the Firestore handle itself.
    for (const f of [
      'src/lib/firebase.ts',
      'src/order/ordersRepo.ts',
      'src/comms/commsRepo.ts',
      'src/expense/expensesRepo.ts',
      'src/dashboard/metrics.ts',
      'src/order/cart.ts',
      'src/order/buildOrder.ts',
      'src/order/options.ts',
      'src/order/promptpay.ts',
      'src/order/queueNumber.ts',
      'src/domain/catalog.ts',
      'src/comms/commsLogic.ts',
      'src/queue/queueActions.ts',
    ]) {
      expect(DOMAIN, `${f} must stay in the protected bucket`).toContain(f)
    }
    expect(DOMAIN.length).toBeGreaterThan(15)
    expect(PRESENTATION.length + UI.length + TOKENS.length).toBeGreaterThan(15)
  })
})

describe('the skin cannot reach the data (Firestore ไม่เปลี่ยน)', () => {
  test('B1: only the Firestore handle and the repos import firebase', () => {
    const importers = scan(load(SHIPPED), FIRESTORE).map((s) => s.file)
    // Non-vacuous: the scanner really does see imports. If this list ever empties, the
    // regex broke — and every "no violations" assertion below would pass for free.
    expect([...new Set(importers)].sort()).toStrictEqual([
      'src/comms/commsRepo.ts',
      'src/expense/expensesRepo.ts',
      'src/lib/firebase.ts',
      'src/order/ordersRepo.ts',
    ])
  })

  test('B2: no presentation, primitive or token file touches Firestore', () => {
    const sites = scan(load([...PRESENTATION, ...UI, ...TOKENS]), FIRESTORE)
    expect(show(sites), 'a screen reaching Firestore directly turns a restyle into a write').toBe('')
  })
})

describe('the data cannot grow a skin (logic ไม่เปลี่ยน)', () => {
  test('C1: no protected module carries a class or a colour token', () => {
    const sites = scan(load(DOMAIN), STYLING)
    expect(show(sites), 'styling leaked into a logic module').toBe('')
  })

  test('C2: no protected module renders markup', () => {
    const sites = scan(load(DOMAIN), MARKUP)
    expect(show(sites), 'a logic module grew a view').toBe('')
  })

  test('C3: no protected module imports the skin', () => {
    const sites = scan(load(DOMAIN), SKIN_IMPORT)
    expect(show(sites), 'logic must not depend on how it is displayed').toBe('')
  })

  test('C4: the skin does import the skin (proves C3 could have failed)', () => {
    const sites = scan(load([...PRESENTATION, ...UI]), SKIN_IMPORT)
    expect(sites.length).toBeGreaterThan(10)
  })
})

describe('teeth — every rule is fed something it must reject', () => {
  const fixture = (src: string) => [{ file: 'fixture.ts', src }]

  test('D1: STYLING flags a class and a token', () => {
    expect(scan(fixture('const a = <b className="x" />'), STYLING)).toHaveLength(1)
    expect(scan(fixture("const bg = 'bg-phantom-surface'"), STYLING)).toHaveLength(1)
    expect(scan(fixture("export const total = (n: number) => n * 2"), STYLING)).toHaveLength(0)
  })

  test('D2: MARKUP flags a closing tag but not a generic', () => {
    expect(scan(fixture('return <div>{x}</div>'), MARKUP)).toHaveLength(1)
    expect(scan(fixture('const [s] = useState<string>("")'), MARKUP)).toHaveLength(0)
  })

  test('D3: FIRESTORE flags both routes to the database', () => {
    expect(scan(fixture("import { doc } from 'firebase/firestore'"), FIRESTORE)).toHaveLength(1)
    expect(scan(fixture("import { getDb } from '../lib/firebase'"), FIRESTORE)).toHaveLength(1)
    expect(scan(fixture("import { L } from '../i18n/labels'"), FIRESTORE)).toHaveLength(0)
  })

  test('D4: SKIN_IMPORT flags a primitive import but not a repo import', () => {
    expect(scan(fixture("import { Button } from '../ui/Button'"), SKIN_IMPORT)).toHaveLength(1)
    expect(scan(fixture("import { createOrder } from '../order/ordersRepo'"), SKIN_IMPORT)).toHaveLength(0)
  })
})

describe('gaps this criterion leaves open', () => {
  test('GAP: the manifest still carries the pre-Neon-Clarity splash colour', () => {
    // vite.config.ts sits in none of the three allowed buckets, so closing this drift
    // inside this spec's work would itself put the diff out of scope. Recorded, not fixed:
    // audit doc §5. Delete this test on the day someone fixes it under a different task.
    const cfg = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')
    expect(cfg).toContain('#1A1A1A')
    expect(readFileSync(join(ROOT, 'src/theme.ts'), 'utf8')).toContain('#0a0a0c')
  })
})
