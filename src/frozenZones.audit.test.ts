/**
 * Acceptance criterion — queue-pro-upgrade, the eighth and last:
 *
 *   "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms"
 *
 * This is a META criterion — it says nothing about what the app does, only about
 * what this branch was allowed to touch. It splits cleanly in half, and only one
 * half is testable:
 *
 *   HALF 1 — "เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน" is the project's Verify
 *     command verbatim. A test asserting that the tests pass is circular, so
 *     NOTHING here attempts it. The evidence is the recorded run in
 *     `docs/autopilot/2026-08-31-frozen-zones-audit.md`.
 *
 *   HALF 2 — "ไม่เปลี่ยน logic บัญชี/เมนู/comms" IS checkable, and is the whole
 *     content of this file. Three claims, each swept rather than eyeballed:
 *
 *       G. the git plumbing — the scanner reads the real branch diff, finds a
 *          path known to have changed, and does NOT find one known to be clean
 *       F. the frozen zones — no accounting, menu or comms LOGIC module differs
 *          from the branch point, and every zone entry names a file that exists
 *       C/P. the census — every changed path is classified, none is left in an
 *          "ไม่รู้ว่าเปลี่ยนอะไร" state, and the production files that changed are
 *          exactly the four declared below, each with its reason
 *       M. a second, weaker net over those four: no line they added or removed
 *          mentions a money or menu identifier
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED: that the accounting / menu / comms logic modules are
 * byte-identical to the branch point. That is a real, complete fact about the
 * diff — `git diff` is the same authority the reviewer will use.
 *
 * WHAT IS **NOT** PROVED:
 *   - **Behaviour.** Byte-identical source can still behave differently if
 *     something it imports changed underneath it. `src/domain/types.ts` is in the
 *     frozen list precisely because it is the shared shape the money fields live
 *     in, but the transitive import closure is NOT walked. A change in, say,
 *     `src/lib/firebase.ts` would reach `expensesRepo` without this file noticing.
 *   - **The M sweep is a heuristic, not a proof.** It greps changed diff lines
 *     for money/menu identifiers. Accounting logic edited without ever writing
 *     one of those words would pass. It is a net under the four files that DID
 *     change, not a substitute for F, which is the actual proof.
 *   - **`.tsx` under the frozen directories is deliberately NOT frozen.** The
 *     spec's own wording is "diff เฉพาะ presentation", and the ui-overhaul
 *     criteria coming next are *required* to restyle accounting screens. Freezing
 *     presentation here would plant a tripwire that a later round would be
 *     tempted to delete outright, taking the logic guarantee with it. Those files
 *     are unchanged today anyway — P1 pins that, since they would surface as
 *     uncategorised production changes.
 *   - Untracked-but-ignored files (`dist/`, `tsconfig.tsbuildinfo`) are invisible
 *     to both `git diff` and `git ls-files --others --exclude-standard`. They are
 *     build output; nothing imports them.
 *
 * WHY A DECLARED LIST AND NOT JUST "src/ IS FROZEN": three of the four changed
 * production files had to change to satisfy criteria 1–7. The interesting claim
 * is not "nothing changed" — it is "exactly these changed, and here is why each
 * one is queue state or presentation rather than money". A future round that
 * needs to touch a fifth file must come here and say why. That is the point.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from 'vitest'

// Vitest runs from the project root. `import.meta.url` is NOT a file: URL here,
// so `fileURLToPath` would throw — cwd is the only reliable anchor.
const REPO = process.cwd()

function git(...args: string[]): string[] {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The branch point, not `main`'s tip. Two-dot `git diff main` would start
 * reporting main's own later commits as if this branch had reverted them the
 * moment main moves ahead.
 */
function branchPoint(): string {
  return git('merge-base', 'main', 'HEAD')[0]
}

/** Tracked edits since the branch point, PLUS untracked new files. */
function changedPaths(): string[] {
  return [
    ...git('diff', '--name-only', branchPoint(), '--'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ].sort()
}

// ── the frozen zones ────────────────────────────────────────────────────────
// Membership was established by grepping for the concepts, not by guessing from
// directory names: `git grep -l -iE 'happyHour|unitPrice|expectedCash|donation'`
// and `git grep -l -E 'MENU|catalog'`.
const FROZEN: { zone: string; files: string[] }[] = [
  {
    zone: 'บัญชี — ยอดขาย, PIN หน้าสรุป',
    files: ['src/dashboard/metrics.ts', 'src/dashboard/pinStore.ts'],
  },
  { zone: 'บัญชี — รายจ่าย', files: ['src/expense/expensesRepo.ts'] },
  {
    zone: 'บัญชี — คิดเงินบนออเดอร์',
    files: ['src/order/buildOrder.ts', 'src/order/cart.ts', 'src/order/promptpay.ts'],
  },
  { zone: 'เมนู — รายการสินค้าและตัวเลือก', files: ['src/domain/catalog.ts', 'src/order/options.ts'] },
  {
    zone: 'comms — 🆘, broadcast, presence',
    files: [
      'src/comms/commsLogic.ts',
      'src/comms/commsRepo.ts',
      'src/comms/useHeartbeat.ts',
      'src/comms/types.ts',
    ],
  },
  {
    // The shape the money fields live in. Widening `unitPrice` here would change
    // accounting without touching any file above it.
    zone: 'โครงร่างร่วม — ชนิดข้อมูลที่ฟิลด์เงินอยู่',
    files: ['src/domain/types.ts'],
  },
]

/** A new logic module dropped into a frozen directory is frozen too. */
const FROZEN_DIR = /^src\/(comms|dashboard|expense)\/[^/]+\.ts$/

function frozenZoneOf(path: string): string | null {
  const named = FROZEN.find((f) => f.files.includes(path))
  if (named) return named.zone
  if (FROZEN_DIR.test(path)) return 'โมดูล logic ใหม่ในไดเรกทอรีที่แช่แข็งไว้'
  return null
}

// ── the census ──────────────────────────────────────────────────────────────
type Category = 'audit-test' | 'src-test' | 'production' | 'doc' | 'config' | 'unknown'

/**
 * Structural, NOT a list of the paths that happen to have changed — otherwise P1
 * below would be comparing a list against itself.
 */
function classify(path: string): Category {
  if (/^src\/.*\.audit\.test\.tsx?$/.test(path)) return 'audit-test'
  if (/^src\/.*\.test\.tsx?$/.test(path)) return 'src-test'
  if (/^src\/.*\.(ts|tsx|css)$/.test(path)) return 'production'
  if (/^(AUTOPILOT|SUMMARY|CONTINUE_HERE)\.md$/.test(path)) return 'doc'
  if (/^docs\/.*\.md$/.test(path)) return 'doc'
  // The style-token configs the ui-overhaul criterion names as an allowed part
  // of the diff. Deliberately narrow: it matches those two filenames and
  // nothing else, so `package.json` / `vite.config.ts` stay 'unknown' and keep
  // tripping C1. Being a category is NOT permission — C2 still demands a reason.
  if (/^(tailwind|postcss)\.config\.(js|cjs|mjs|ts)$/.test(path)) return 'config'
  return 'unknown'
}

/**
 * Every production file this branch is allowed to have changed, with the reason
 * it is queue state or presentation rather than บัญชี/เมนู/comms.
 *
 * Adding an entry here is a deliberate act. If a later round makes this test
 * fail, the fix is to add the file and justify it — never to loosen `classify`.
 */
const PRODUCTION_CHANGES: Record<string, string> = {
  'src/order/ordersRepo.ts':
    'Undo — updateOrderStatus maps undefined to deleteField(). Changes how a QUEUE STATUS is written; createOrder and the money fields on the document are untouched.',
  'src/queue/queueActions.ts':
    'Undo — orderSnapshot returns every undoable field, undefined meaning "this order never had one"; cancel() moved here from the panel. Queue state only.',
  'src/screens/QueuePanel.tsx':
    'Undo (Q.cancel) + Idempotency (a useRef Set so a repeated press cannot write twice before the snapshot lands).',
  'src/ui/Button.tsx':
    'Touch target ≥44px — one min-h-[44px] added to the primitive\'s base className, so the floor reaches every call site including the ones that do not repeat it. Presentation only: no variant, no handler and no prop changed, and no button on any screen renders shorter than 44px today either way.',
  'src/screens/DisplayScreen.tsx':
    'Display glanceable — one <En> wrapper so English reads as subordinate, and LIVE says สด · LIVE. Neon Clarity — the yellow shadow-[...] came off the เตรียมตัว <section>, because §2 rations glow to three targets and forbids it on cards. Presentation only, both times.',
}

/**
 * Every style-token config this branch is allowed to have changed, with the
 * reason. Same contract as PRODUCTION_CHANGES: a category exists so C1 can say
 * "I know what this is", not so the file stops being watched.
 */
const CONFIG_CHANGES: Record<string, string> = {
  'tailwind.config.js':
    'ui-overhaul §2/§3 — the borderRadius scale the spec names (sm 10 · md 14 · lg 16 · xl 20), declared in px because index.css sets html{font-size:120%} and §2 scopes the +20% base scale to type/buttons/spacing/numbers, not corner radius. Tokens only: no colour, font, screens or content glob changed.',
}

/** Money and menu identifiers, for the M sweep over changed diff lines. */
const MONEY_OR_MENU =
  /\b(total|unitPrice|price|qty|amount|discount|happyHour|expense|donation|cash|paid|promptPay|catalog|menuItem)\b/i

/** The +/- lines of a diff, without the +++/--- file headers. */
function diffBodyLines(path: string): string[] {
  return git('diff', '-U0', branchPoint(), '--', path).filter(
    (line) => /^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line),
  )
}

// ── G: the git plumbing itself ──────────────────────────────────────────────

test('G0: the scanner reads the real repo, and discriminates changed from clean', () => {
  // Without this, every `toStrictEqual([])` below passes on a typo'd git command
  // that returns an empty stdout while checking absolutely nothing.
  expect(existsSync(join(REPO, 'package.json'))).toBe(true)
  expect(branchPoint()).toMatch(/^[0-9a-f]{40}$/)

  // finds a path we know changed...
  expect(git('diff', '--name-only', branchPoint(), '--', 'src/screens/DisplayScreen.tsx')).toStrictEqual([
    'src/screens/DisplayScreen.tsx',
  ])
  // ...and does not find one we know is clean. A query that always returned
  // everything would survive the first assertion but not this one.
  expect(git('diff', '--name-only', branchPoint(), '--', 'package.json')).toStrictEqual([])

  // the diff-line reader keeps only the body, not the ---/+++ headers
  const body = diffBodyLines('src/order/ordersRepo.ts')
  expect(body.length).toBeGreaterThan(0)
  expect(body.every((l) => /^[+-]/.test(l))).toBe(true)
  expect(body.some((l) => l.startsWith('+++') || l.startsWith('---'))).toBe(false)
  expect(body.some((l) => l.includes('deleteField'))).toBe(true)
})

test('G1: the sweep finds every change this branch is known to carry', () => {
  const changed = changedPaths()

  // The spine. `changed` going silently empty is the one failure that would make
  // F1 and C1 pass while proving nothing at all.
  for (const path of Object.keys(PRODUCTION_CHANGES)) expect(changed).toContain(path)
  for (const path of [
    'src/undoRoundTrip.audit.test.tsx',
    'src/undoDeleteField.audit.test.ts',
    'src/noShowRecall.audit.test.tsx',
    'src/reannounce.audit.test.tsx',
    'src/callSpecific.audit.test.tsx',
    'src/idempotency.audit.test.tsx',
    'src/displayCentering.audit.test.tsx',
    'src/displayGlanceable.audit.test.tsx',
  ]) {
    expect(changed).toContain(path)
  }
  expect(changed).toContain('src/queue/queueActions.test.ts')
})

// ── F: the frozen zones ─────────────────────────────────────────────────────

test('F0: the zone matcher, pinned to fixtures rather than to the repo', () => {
  expect(frozenZoneOf('src/order/cart.ts')).toBe('บัญชี — คิดเงินบนออเดอร์')
  expect(frozenZoneOf('src/domain/catalog.ts')).toBe('เมนู — รายการสินค้าและตัวเลือก')
  expect(frozenZoneOf('src/comms/commsLogic.ts')).toBe('comms — 🆘, broadcast, presence')

  // a file nobody listed, dropped into a frozen directory, is still caught
  expect(frozenZoneOf('src/comms/newPricingHack.ts')).toBe('โมดูล logic ใหม่ในไดเรกทอรีที่แช่แข็งไว้')
  expect(frozenZoneOf('src/dashboard/whatever.test.ts')).toBe('โมดูล logic ใหม่ในไดเรกทอรีที่แช่แข็งไว้')

  // and the documented limits, asserted so they cannot drift silently
  expect(frozenZoneOf('src/comms/AlertButtons.tsx')).toBeNull() // presentation, by design
  expect(frozenZoneOf('src/order/ordersRepo.ts')).toBeNull() // queue writes, deliberately not frozen
  expect(frozenZoneOf('src/queue/queueActions.ts')).toBeNull()
})

test('F1: every file named in a frozen zone exists and is matched by the rule', () => {
  // The anti-vacuity test. A zone entry with a typo (`src/comm/...`) matches no
  // real file, so it can never appear in the changed set, so F2 stays green
  // while guarding nothing.
  const missing = FROZEN.flatMap((f) => f.files).filter((p) => !existsSync(join(REPO, p)))
  expect(missing).toStrictEqual([])

  const unmatched = FROZEN.flatMap((f) => f.files).filter((p) => frozenZoneOf(p) === null)
  expect(unmatched).toStrictEqual([])

  // git agrees these paths are real tracked files, not just names on disk
  const tracked = git('ls-files', '--', ...FROZEN.flatMap((f) => f.files))
  expect(tracked.sort()).toStrictEqual(FROZEN.flatMap((f) => f.files).sort())
})

test('F2: no บัญชี / เมนู / comms logic module differs from the branch point', () => {
  const violations = changedPaths()
    .map((path) => ({ path, zone: frozenZoneOf(path) }))
    .filter((hit) => hit.zone !== null)

  expect(violations).toStrictEqual([])
})

// ── C / P: the census ───────────────────────────────────────────────────────

test('C0: the classifier, pinned to fixtures', () => {
  expect(classify('src/order/cart.ts')).toBe('production')
  expect(classify('src/screens/DisplayScreen.tsx')).toBe('production')
  expect(classify('src/index.css')).toBe('production')
  expect(classify('src/order/cart.test.ts')).toBe('src-test')

  // order is load-bearing: an audit test is also a `.test.tsx`, and if the
  // src-test rule ran first every audit file would be misfiled and P1 would
  // still pass — while a genuine production change hid in the same bucket.
  expect(classify('src/displayGlanceable.audit.test.tsx')).toBe('audit-test')
  expect(classify('src/undoDeleteField.audit.test.ts')).toBe('audit-test')

  expect(classify('docs/autopilot/2026-08-31-frozen-zones-audit.md')).toBe('doc')
  expect(classify('AUTOPILOT.md')).toBe('doc')

  expect(classify('tailwind.config.js')).toBe('config')
  expect(classify('postcss.config.js')).toBe('config')

  // 'unknown' has to be reachable, or C1 is an assertion about nothing — and it
  // has to stay reachable for the neighbours of the new 'config' rule in
  // particular, or that rule quietly became "any config file is fine".
  expect(classify('firestore.rules')).toBe('unknown')
  expect(classify('package.json')).toBe('unknown')
  expect(classify('vite.config.ts')).toBe('unknown')
  expect(classify('tsconfig.json')).toBe('unknown')
})

test('C1: no changed path is left in an "ไม่รู้ว่าเปลี่ยนอะไร" state', () => {
  const uncategorised = changedPaths().filter((p) => classify(p) === 'unknown')
  expect(uncategorised).toStrictEqual([])
})

test('C2: the style-token configs that changed are exactly the declared ones, each with a reason', () => {
  // Without this, adding the 'config' category to classify() would have been a
  // way to make C1 green by making a changed file invisible, which is the one
  // repair this file's header forbids.
  const changedConfig = changedPaths().filter((p) => classify(p) === 'config')
  expect(changedConfig).toStrictEqual(Object.keys(CONFIG_CHANGES).sort())

  for (const reason of Object.values(CONFIG_CHANGES)) {
    expect(reason.length).toBeGreaterThan(40)
  }
})

test('P1: the production files that changed are exactly the four declared, each with a reason', () => {
  const changedProduction = changedPaths().filter((p) => classify(p) === 'production')
  expect(changedProduction).toStrictEqual(Object.keys(PRODUCTION_CHANGES).sort())

  // a declared path with an empty reason is the same as an undeclared one
  for (const reason of Object.values(PRODUCTION_CHANGES)) {
    expect(reason.length).toBeGreaterThan(40)
  }
})

test('M1: no line added or removed in those four mentions money or menu', () => {
  // The weaker second net — see SCOPE above. F2 is the actual proof; this
  // catches money logic migrating INTO a file that was allowed to change.
  const offenders = Object.keys(PRODUCTION_CHANGES).flatMap((path) =>
    diffBodyLines(path)
      .filter((line) => MONEY_OR_MENU.test(line))
      .map((line) => `${path}: ${line}`),
  )
  expect(offenders).toStrictEqual([])
})

test('M0: the money/menu reader, pinned to fixtures', () => {
  expect(MONEY_OR_MENU.test('+  const total = sum(items)')).toBe(true)
  expect(MONEY_OR_MENU.test('+  unitPrice: happyHour ? 20 : 25,')).toBe(true)
  expect(MONEY_OR_MENU.test('+  import { CATALOG } from "./catalog"')).toBe(true)

  // must not fire on the queue vocabulary the four files are full of
  expect(MONEY_OR_MENU.test('+  return { status: "serving", servingAt: now }')).toBe(false)
  expect(MONEY_OR_MENU.test('+  moved.current.add(order.id)')).toBe(false)
  expect(MONEY_OR_MENU.test('+  <En>· {L("display.live").en}</En>')).toBe(false)
})
