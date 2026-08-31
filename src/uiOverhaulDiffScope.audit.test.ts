/**
 * Acceptance criterion — ui-overhaul, the fourth:
 *
 *   "Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)"
 *
 * `src/frozenZones.audit.test.ts` already proved the sibling half of this
 * sentence for the *queue-pro-upgrade* spec: the บัญชี / เมนู / comms logic
 * modules are byte-identical to the branch point. That file is a WHITELIST — it
 * can only ever say "these named files did not change". It is silent about a
 * file nobody thought to list, and it never looks at Firestore at all.
 *
 * This file asks the inverse, total question, which is what "diff เฉพาะ …"
 * actually means: **is every path in the branch diff inside one of the
 * categories the criterion allows?** That needs a census with a declared escape
 * hatch, not a freeze list. Four claims:
 *
 *   R. Firestore itself — `firestore.rules` and `firestore.indexes.json` are
 *      byte-identical to the branch point, and no Firebase config surface at all
 *      appears in the diff (including one nobody has invented yet, e.g. a new
 *      `firestore.indexes.staging.json`).
 *   T. the Tailwind config named in the criterion exists, is the tokens file the
 *      spec §7 calls the single source of truth, and is an ALLOWED category —
 *      so the Neon Clarity round can edit it without tripping this sweep.
 *   S. the census — every changed path lands in an allowed bucket, or is named
 *      in `DECLARED_OUTSIDE_THE_UI_DIFF` with a reason.
 *   P. presentation purity — no file in an allowed *code* bucket (src/ui,
 *      Tailwind/CSS, `.tsx`) added or removed a direct Firestore SDK call. This
 *      is the net under the one thing a path-based census structurally cannot
 *      see: Firestore work smuggled into a screen.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - `firestore.rules` / `firestore.indexes.json` are unchanged. That is total
 *     and exact — `git diff` is the same authority a reviewer would use.
 *   - Every single path in the branch diff is accounted for. Nothing is in an
 *     "ไม่รู้ว่ามันควรอยู่ในหมวดไหน" state. This is the claim `frozenZones`
 *     could not make, because a whitelist has no opinion about the unlisted.
 *   - `src/lib/firebase.ts` — the Firestore client init that `frozenZones`'s own
 *     SCOPE section names as a hole it cannot see — falls into `other` here, so
 *     changing it forces a written declaration. The hole is narrowed, not by
 *     listing the file, but by the census being total.
 *
 * WHAT IS **NOT** PROVED:
 *   - **That a `.tsx` change is really presentation.** `presentation` is decided
 *     by PATH, never by content. It is not a guess that this matters: today
 *     `src/screens/QueuePanel.tsx` carries the idempotency `useRef` Set, which is
 *     logic living in a screen, and this file's census calls it `presentation`
 *     all the same. P1 is the only net under that bucket and it catches exactly
 *     one species — a raw Firestore SDK call. Business logic written in plain
 *     TypeScript inside a screen passes.
 *   - **Behaviour.** Same limit `frozenZones` records: the import closure is not
 *     walked. A file can be in an allowed bucket and still change what an
 *     unchanged module does.
 *   - **`.gitignore`d output.** `dist/`, `*.tsbuildinfo` are invisible to both
 *     `git diff` and `git ls-files --others --exclude-standard`.
 *   - **Nothing about how the UI LOOKS.** This criterion is about the SHAPE of
 *     the diff. "ทุกหน้าเป็นสไตล์ Neon Clarity" is a different, still-open
 *     criterion and no assertion here speaks to it.
 *
 * ⚠️ FOR THE ROUND THAT EDITS `tailwind.config.js` (Neon Clarity): this sweep
 * allows it — T1 pins that. But `frozenZones`'s `classify()` has no config
 * category, so it will call `tailwind.config.js` **'unknown'** and its C1 will go
 * red. The fix there is to ADD a config category, never to loosen the rule that
 * routes production files to P1.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
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

/** The branch point, not `main`'s tip — see `frozenZones.audit.test.ts`. */
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

/** The +/- lines of a diff, without the +++/--- file headers. */
function diffBodyLines(path: string): string[] {
  return git('diff', '-U0', branchPoint(), '--', path).filter(
    (line) => /^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line),
  )
}

// ── the census ──────────────────────────────────────────────────────────────

/**
 * The categories the criterion names — "presentation + Tailwind config + src/ui"
 * — plus the two the project's own contract adds (tests prove the criteria,
 * docs record them). Anything else is `other` and must be declared.
 */
type Bucket = 'test' | 'doc' | 'ui-primitive' | 'style-config' | 'presentation' | 'other'

const ALLOWED_WITHOUT_DECLARATION: Bucket[] = [
  'test',
  'doc',
  'ui-primitive',
  'style-config',
  'presentation',
]

/** Buckets that hold shipped code, and so are worth sweeping for stray Firestore. */
const CODE_BUCKETS: Bucket[] = ['ui-primitive', 'style-config', 'presentation']

/**
 * Structural — derived from the path shape alone, never from the list of paths
 * that happen to have changed, or S2 would be comparing a list against itself.
 *
 * Rule order is load-bearing. `src/ui/Button.test.tsx` is BOTH a test and a file
 * under `src/ui`; if the ui-primitive rule ran first, every primitive's test
 * would be filed as shipped code and P1 would then sweep test files — which
 * legitimately mention `deleteField`, `updateDoc` and friends while mocking
 * them, so P1 would fail for a reason that is not a defect.
 */
function classifyScope(path: string): Bucket {
  if (/^src\/.+\.test\.tsx?$/.test(path)) return 'test'
  if (/^docs\/.+\.md$/.test(path) || /^[^/]+\.md$/.test(path)) return 'doc'
  if (/^src\/ui\/.+\.tsx?$/.test(path)) return 'ui-primitive'
  if (/^(tailwind|postcss)\.config\.(js|cjs|mjs|ts)$/.test(path)) return 'style-config'
  if (/^src\/.+\.css$/.test(path)) return 'style-config'
  if (/^src\/.+\.tsx$/.test(path)) return 'presentation'
  return 'other'
}

/**
 * Files this branch changed that are NOT presentation, Tailwind config or
 * `src/ui` — each with the reason it is nonetheless not Firestore, บัญชี, เมนู
 * or comms logic.
 *
 * Both entries exist because the queue-pro-upgrade spec's criteria were proved
 * on this same branch BEFORE any ui-overhaul work started. They are honest
 * exceptions to *this* criterion's wording, not presentation being relabelled.
 * A later round that needs a third entry must come here and write why.
 */
const DECLARED_OUTSIDE_THE_UI_DIFF: Record<string, string> = {
  'src/order/ordersRepo.ts':
    'queue-pro-upgrade / Undo — updateOrderStatus maps an undefined field to deleteField() so an undo can remove a field the action invented. Queue-status writes only; createOrder and every money field on the document are untouched, and frozenZones F2 pins the accounting modules byte-for-byte.',
  'src/queue/queueActions.ts':
    'queue-pro-upgrade / Undo — orderSnapshot returns every undoable field (undefined meaning "this order never had one") and cancel() moved here out of the panel. Pure queue-state functions: no Firestore call, no price, no menu.',
}

/** A direct Firestore SDK call, as opposed to a call into the repo layer. */
const FIRESTORE_SDK =
  /\b(updateDoc|setDoc|addDoc|deleteDoc|getDoc|getDocs|onSnapshot|runTransaction|writeBatch|serverTimestamp|deleteField|collection|firebase\/firestore)\b/

/** Firebase/Firestore configuration surfaces, by shape rather than by name. */
const FIREBASE_SURFACE = /^(\.firebaserc|firebase\.json|firestore\..+)$/

// ── R: Firestore itself ─────────────────────────────────────────────────────

test('R0: the Firebase reader is real, and the surface matcher is pinned to fixtures', () => {
  // Without this, every toStrictEqual([]) below passes on a git invocation that
  // silently returns nothing while checking absolutely nothing.
  expect(branchPoint()).toMatch(/^[0-9a-f]{40}$/)
  expect(git('diff', '--name-only', branchPoint(), '--', 'src/screens/DisplayScreen.tsx')).toStrictEqual([
    'src/screens/DisplayScreen.tsx',
  ])

  const surfaces = ['.firebaserc', 'firebase.json', 'firestore.rules', 'firestore.indexes.json']
  for (const path of surfaces) {
    expect(existsSync(join(REPO, path))).toBe(true)
  }
  expect(git('ls-files', '--', ...surfaces).sort()).toStrictEqual([...surfaces].sort())

  expect(FIREBASE_SURFACE.test('firestore.rules')).toBe(true)
  expect(FIREBASE_SURFACE.test('firestore.indexes.json')).toBe(true)
  expect(FIREBASE_SURFACE.test('firebase.json')).toBe(true)
  expect(FIREBASE_SURFACE.test('.firebaserc')).toBe(true)
  // a surface nobody has invented yet still matches — the point of a shape rule
  expect(FIREBASE_SURFACE.test('firestore.indexes.staging.json')).toBe(true)

  // and it must not swallow ordinary source, or R2 would be unfalsifiable
  expect(FIREBASE_SURFACE.test('src/lib/firebase.ts')).toBe(false)
  expect(FIREBASE_SURFACE.test('tailwind.config.js')).toBe(false)
  expect(FIREBASE_SURFACE.test('package.json')).toBe(false)
})

test('R1: firestore.rules and firestore.indexes.json are byte-identical to the branch point', () => {
  expect(
    git('diff', '--name-only', branchPoint(), '--', 'firestore.rules', 'firestore.indexes.json'),
  ).toStrictEqual([])

  // Anti-vacuity: the files being compared are the real ones, not empty stubs
  // that would be trivially unchanged.
  const rules = readFileSync(join(REPO, 'firestore.rules'), 'utf8')
  expect(rules).toContain("rules_version = '2'")
  expect(rules).toContain('match /databases/{database}/documents')

  const indexes = JSON.parse(readFileSync(join(REPO, 'firestore.indexes.json'), 'utf8'))
  expect(Array.isArray(indexes.indexes)).toBe(true)
})

test('R2: no Firebase or Firestore configuration surface appears in the branch diff', () => {
  const touched = changedPaths().filter((path) => FIREBASE_SURFACE.test(path))
  expect(touched).toStrictEqual([])
})

// ── T: the Tailwind config the criterion names ──────────────────────────────

test('T0: tailwind.config.js exists, is tracked, and is the tokens file the spec names', () => {
  expect(existsSync(join(REPO, 'tailwind.config.js'))).toBe(true)
  expect(git('ls-files', '--', 'tailwind.config.js')).toStrictEqual(['tailwind.config.js'])

  // Spec §7: "extend config เป็น single source of truth ของ tokens". If this
  // were an empty default config, calling it an allowed category would be
  // permission to change a file that carries nothing.
  const config = readFileSync(join(REPO, 'tailwind.config.js'), 'utf8')
  expect(config).toContain('extend')
  expect(config).toContain('phantom-orange')
  expect(config).toContain('./src/**/*.{ts,tsx}')
})

test('T1: Tailwind and CSS config are an ALLOWED category, so restyling cannot trip this sweep', () => {
  expect(classifyScope('tailwind.config.js')).toBe('style-config')
  expect(classifyScope('postcss.config.js')).toBe('style-config')
  expect(classifyScope('src/index.css')).toBe('style-config')
  expect(ALLOWED_WITHOUT_DECLARATION).toContain('style-config')

  // The criterion's other two named categories, same guarantee.
  expect(ALLOWED_WITHOUT_DECLARATION).toContain('ui-primitive')
  expect(ALLOWED_WITHOUT_DECLARATION).toContain('presentation')
})

// ── S: the census ───────────────────────────────────────────────────────────

test('S0: the classifier, pinned to fixtures, with every bucket reachable', () => {
  // order is load-bearing — a test under src/ui must file as a test
  expect(classifyScope('src/ui/Button.test.tsx')).toBe('test')
  expect(classifyScope('src/ui/primitives.test.tsx')).toBe('test')
  expect(classifyScope('src/displayGlanceable.audit.test.tsx')).toBe('test')
  expect(classifyScope('src/frozenZones.audit.test.ts')).toBe('test')

  expect(classifyScope('src/ui/Button.tsx')).toBe('ui-primitive')
  expect(classifyScope('src/ui/QueueNumber.tsx')).toBe('ui-primitive')

  expect(classifyScope('src/screens/DisplayScreen.tsx')).toBe('presentation')
  expect(classifyScope('src/App.tsx')).toBe('presentation')

  expect(classifyScope('docs/autopilot/2026-08-31-frozen-zones-audit.md')).toBe('doc')
  expect(classifyScope('AUTOPILOT.md')).toBe('doc')
  expect(classifyScope('SUMMARY.md')).toBe('doc')

  // 'other' has to be reachable, or S2 is an assertion about nothing. These five
  // are the shapes that matter: repo layer, Firestore client init, shared token
  // module, Firestore config, package manifest.
  expect(classifyScope('src/order/ordersRepo.ts')).toBe('other')
  expect(classifyScope('src/lib/firebase.ts')).toBe('other')
  expect(classifyScope('src/theme.ts')).toBe('other')
  expect(classifyScope('firestore.rules')).toBe('other')
  expect(classifyScope('package.json')).toBe('other')
})

test('S1: the census reads the real branch diff and buckets it as expected', () => {
  const changed = changedPaths()

  // The spine. `changed` going silently empty is the one failure that would make
  // R2 and S2 pass while proving nothing at all.
  expect(changed.length).toBeGreaterThan(20)

  const expected: Record<string, Bucket> = {
    'src/screens/DisplayScreen.tsx': 'presentation',
    'src/screens/QueuePanel.tsx': 'presentation',
    'src/order/ordersRepo.ts': 'other',
    'src/queue/queueActions.ts': 'other',
    'src/queue/queueActions.test.ts': 'test',
    'src/frozenZones.audit.test.ts': 'test',
    'AUTOPILOT.md': 'doc',
    'docs/autopilot/2026-08-31-frozen-zones-audit.md': 'doc',
  }
  for (const [path, bucket] of Object.entries(expected)) {
    expect(changed).toContain(path)
    expect(classifyScope(path)).toBe(bucket)
  }
})

test('S2: every changed path is in an allowed category, or is declared with a reason', () => {
  const undeclared = changedPaths()
    .filter((path) => !ALLOWED_WITHOUT_DECLARATION.includes(classifyScope(path)))
    .filter((path) => !(path in DECLARED_OUTSIDE_THE_UI_DIFF))

  expect(undeclared).toStrictEqual([])
})

// ── D: the declarations are not fiction ─────────────────────────────────────

test('D0: every declared path exists, is tracked, and really is outside the allowed categories', () => {
  const paths = Object.keys(DECLARED_OUTSIDE_THE_UI_DIFF)
  expect(paths.length).toBeGreaterThan(0)

  // A typo'd declaration (`src/oder/ordersRepo.ts`) excuses nothing and hides
  // nothing — it just sits there looking like coverage.
  expect(paths.filter((p) => !existsSync(join(REPO, p)))).toStrictEqual([])
  expect(git('ls-files', '--', ...paths).sort()).toStrictEqual([...paths].sort())

  // A declaration for something already allowed is worse than none: it implies
  // the file needed an excuse, so nobody re-checks whether it still does.
  expect(paths.filter((p) => ALLOWED_WITHOUT_DECLARATION.includes(classifyScope(p)))).toStrictEqual([])
})

test('D1: every declared path actually changed, and every reason says something', () => {
  const changed = changedPaths()
  const stale = Object.keys(DECLARED_OUTSIDE_THE_UI_DIFF).filter((p) => !changed.includes(p))
  expect(stale).toStrictEqual([])

  for (const reason of Object.values(DECLARED_OUTSIDE_THE_UI_DIFF)) {
    expect(reason.length).toBeGreaterThan(60)
  }
})

// ── P: presentation purity ──────────────────────────────────────────────────

test('P0: the Firestore SDK matcher, pinned to fixtures', () => {
  expect(FIRESTORE_SDK.test("+import { doc, setDoc } from 'firebase/firestore'")).toBe(true)
  expect(FIRESTORE_SDK.test('+    await updateDoc(ref, { status: "serving" })')).toBe(true)
  expect(FIRESTORE_SDK.test('+  runTransaction(db, async (tx) => {')).toBe(true)
  expect(FIRESTORE_SDK.test('+  onSnapshot(q, (snap) => setOrders(snap.docs))')).toBe(true)

  // A call into the repo layer is the whole point of having a repo layer, and a
  // screen is allowed to make one. If this fired, P1 would be red today for a
  // line that is not a defect.
  expect(FIRESTORE_SDK.test('+  const runUndo = () => updateOrderStatus(undo.id, undo.before)')).toBe(false)
  expect(FIRESTORE_SDK.test('+  useEffect(() => subscribeBoothOrders(booth, setOrders), [booth])')).toBe(false)
  expect(FIRESTORE_SDK.test('+          {L(`booth.${booth}`).th} <En>· {L(`booth.${booth}`).en}</En>')).toBe(false)
})

test('P1: no src/ui, Tailwind/CSS or .tsx file added or removed a direct Firestore SDK call', () => {
  const scanned = changedPaths().filter((path) => CODE_BUCKETS.includes(classifyScope(path)))

  // Spine — an empty `scanned` would make the assertion below vacuous, and the
  // screens are exactly where this criterion's risk lives.
  expect(scanned).toContain('src/screens/DisplayScreen.tsx')
  expect(scanned).toContain('src/screens/QueuePanel.tsx')

  // ...and the reader really pulled diff bodies out of them, rather than
  // returning an empty list that would satisfy the filter below for free.
  const bodies = scanned.flatMap((path) => diffBodyLines(path))
  expect(bodies.length).toBeGreaterThan(20)
  expect(bodies.some((line) => line.startsWith('+'))).toBe(true)

  const offenders = scanned.flatMap((path) =>
    diffBodyLines(path)
      .filter((line) => FIRESTORE_SDK.test(line))
      .map((line) => `${path}: ${line}`),
  )
  expect(offenders).toStrictEqual([])
})
