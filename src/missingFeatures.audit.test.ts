import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE LAST THREE CRITERIA — pinned as DOCUMENTED GAPS, not as passing features
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Three acceptance criteria remain from `2026-07-24-hq-comms-crosssell-design.md`:
 *
 *   §4.3  "HQ toggle Happy-Hour → Order Station คิดราคาใหม่ + Display ขึ้นป้าย;
 *          order บันทึก unitPrice จริง"
 *   §4.5  "ปิดซุ้ม → expectedCash ตรงกับ Σ เงินสด, กรอกเงินจริง → diff บันทึกถูก"
 *   §4.6  "Passport: สแกนครบ 3 ซุ้ม → ขึ้นรางวัล; สแกนซุ้มเดิมซ้ำไม่เพิ่มแสตมป์;
 *          offline แล้ว sync ได้"
 *
 * All three are FEATURES THAT DO NOT EXIST. The project Goal admits exactly this
 * outcome — a criterion may be closed either by an automated proof OR by being
 * "บันทึกไว้อย่างชัดเจนว่าเป็นช่องว่างที่ยังขาด พร้อมระบุว่าขาดตรงไหน". Building
 * them would mean writing new pricing and cash-accounting logic, which the
 * project's Out-of-scope list forbids outright. So this file's job is the second
 * thing: say precisely WHAT IS MISSING, clause by clause, in a form that goes RED
 * the day somebody builds it.
 *
 * ─── how this differs from `offlineSync.audit.test.tsx` G1/G2/G3 ───
 *
 * That file already pinned these same three features — but ONLY from the offline
 * angle, and only with a single word-grep each ("is `pricingOverride` mentioned
 * anywhere?"). It was answering "§5.3/§5.4 describe offline behaviour for things
 * that do not exist". THIS file answers the different and larger question the
 * three criteria actually ask: **of each criterion's individual clauses, which
 * are absent, which are already built, and which are built but deviate?**
 *
 * That distinction is the entire point, because TWO OF THE THREE ARE HALF BUILT:
 *
 *   §4.3 — `unitPrice` IS already persisted on every order line (H4). The audit
 *          trail the criterion asks for exists; the override that would make it
 *          differ from the catalogue price does not.
 *   §4.5 — `expectedCash` IS already computed AND already on screen (C2). What is
 *          missing is the close-booth session that records `countedCash`/`diff`.
 *
 * A reader told "none of this exists" would go build things that already work.
 *
 * ─── the three rules this file obeys (learned the hard way, six times) ───
 *
 * A test that asserts the ABSENCE of something with `expect(list).toStrictEqual([])`
 * gives a byte-identical result whether the code is clean or THE SCANNER IS BLIND.
 * `offlineSync` M10 made `filesMentioning` return [] unconditionally and SEVEN gap
 * tests went green together. So, per that lesson:
 *
 *   1. CONTROL — every predicate used for a `[]` assertion is first fed a fixture
 *      it MUST find, in the same test. See group S.
 *   2. CENSUS OF THE INPUT SET — a control catches a blind predicate but NOT a
 *      predicate fed a shrunken file list (`offlineSync` M11). So S0 pins how many
 *      files are scanned and exactly which ones.
 *   3. FUTURE MUTATIONS — "has no killer" and "is vacuous" are only distinguishable
 *      by proving a killer exists. The mutation table for this file simulates
 *      somebody BUILDING each feature and records which tests go red.
 *
 * Decoys use `/(?!)/`. Never `/$^/` — `$` and `^` are zero-width and both hold at
 * position 0 of an empty string, so `/$^/` matches every blank line.
 *
 * ─── 🚨 what RED means in this file ───
 *
 * Nearly every assertion here pins a feature's ABSENCE. If one goes red, the
 * overwhelmingly likely cause is THAT SOMEBODY BUILT THE FEATURE — which is the
 * repair, not a regression. Do not "fix" a red test here by loosening it. Go read
 * `docs/autopilot/2026-09-07-missing-features-audit.md`, then promote the test
 * into a real assertion about the new behaviour.
 *
 * Same shape as `idempotency E1`, `pwa I1`, `alert C5`, `donation T1–T3`,
 * `hq G0/G1`, `offlineSync G1–G5`.
 *
 * ─── 🚨 what this file does NOT prove ───
 *
 * Nothing is rendered and nothing is executed. This is a SOURCE SWEEP: it reads
 * the text of 46 production files. It can prove a collection is never named and a
 * field never written; it cannot prove that some existing code does not amount to
 * the feature under another name. Where the criterion's own vocabulary is the
 * thing being searched for (`cashSessions`, `stampedBooths`), that gap is narrow.
 */

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

/** Every production source file under src/ — no tests, no audits.
 *
 *  Excluding `*.test.*` is load-bearing, not hygiene: `hqTwoDevices.audit.test.tsx`
 *  contains the string "ปิดซุ้มสามทุ่ม" as the BODY OF A BROADCAST MESSAGE fixture.
 *  A sweep that scanned test files would report the close-booth feature as present
 *  on the strength of a staff member typing "closing at 9pm" into a chat box. */
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

/** Production files mentioning any of these patterns. Case-insensitive. */
function filesMentioning(words: string[]): string[] {
  const re = new RegExp(words.join('|'), 'i')
  return productionFiles().filter((f) => re.test(read(f)))
}

/** Every Firestore collection this app actually touches, by name. */
function collectionsUsed(): string[] {
  const found = new Set<string>()
  for (const f of productionFiles()) {
    for (const m of read(f).matchAll(/collection\(\s*getDb\(\)\s*,\s*'([^']+)'/g)) {
      found.add(m[1])
    }
  }
  return [...found].sort()
}

/** The names of every exported interface/type alias in a source file. */
function exportedTypes(rel: string): string[] {
  const out: string[] = []
  for (const m of read(rel).matchAll(/export\s+(?:interface|type)\s+(\w+)/g)) out.push(m[1])
  return out.sort()
}

// ════════════════════════════════════════════════════════════════════════════
// S. THE SCANNER ITSELF
//
// Rules 1 and 2. Without this group every `toStrictEqual([])` below is
// indistinguishable from a scanner that reads nothing.
// ════════════════════════════════════════════════════════════════════════════
describe('S. the scanner is looking at something', () => {
  /**
   * S0 — CENSUS OF THE INPUT SET (rule 2). A control proves the predicate can
   * see; it does NOT prove the predicate was handed the whole app.
   * `offlineSync` M11 shrank the file list to `src/comms` and the control still
   * passed. Pin the count AND the membership.
   *
   * 🚨 A NEW PRODUCTION FILE MAKES THIS RED ON PURPOSE. Add it to the list and
   * re-read the gap tests below — a new file is exactly where a new feature
   * would arrive.
   */
  test('S0: the sweep reads all 46 production files, tests excluded', () => {
    const files = productionFiles()
    expect(files.length).toBe(46)

    // Spot-pin the corners: the entry point, each feature area, the UI kit.
    expect(files).toContain('src/main.tsx')
    expect(files).toContain('src/dashboard/metrics.ts')
    expect(files).toContain('src/order/cart.ts')
    expect(files).toContain('src/order/options.ts')
    expect(files).toContain('src/screens/OrderStation.tsx')
    expect(files).toContain('src/screens/DashboardScreen.tsx')
    expect(files).toContain('src/screens/DisplayScreen.tsx')
    expect(files).toContain('src/domain/types.ts')
    expect(files).toContain('src/i18n/labels.ts')

    // and NO test file leaked in — see the doc comment on productionFiles().
    expect(files.filter((f) => /\.test\./.test(f))).toStrictEqual([])
    expect(files.filter((f) => /audit/i.test(f))).toStrictEqual([])
  })

  /**
   * S1 — THE CONTROL for `filesMentioning` (rule 1). Feed it a token that MUST
   * be found, then a token that must not be. If someone blinds the predicate,
   * the first half fails here before the gap tests can go quietly green.
   */
  test('S1: filesMentioning finds a symbol that DOES exist, and misses one that does not', () => {
    expect(filesMentioning(['lineUnitPrice'])).toStrictEqual([
      'src/order/cart.ts',
      'src/order/options.ts',
      'src/screens/OrderStation.tsx',
    ])
    expect(filesMentioning(['ZZZ-NO-SUCH-TOKEN-ZZZ'])).toStrictEqual([])
  })

  /**
   * S2 — THE CONTROL for `collectionsUsed`, and the census that group D leans on.
   * Exactly four collections are wired up today. The three the remaining criteria
   * need are not among them — that is D1, and it is only meaningful because this
   * test proves the extractor finds the four that ARE there.
   */
  test('S2: exactly four Firestore collections are wired up', () => {
    expect(collectionsUsed()).toStrictEqual(['expenses', 'messages', 'orders', 'presence'])
  })

  /**
   * S3 — THE CONTROL for `exportedTypes`. The domain model is a closed list; D2
   * asserts three names are absent from it, which proves nothing unless the
   * extractor demonstrably finds the names that are present.
   */
  test('S3: the domain model exports exactly these types', () => {
    expect(exportedTypes('src/domain/types.ts')).toStrictEqual([
      'BoothId', 'Expense', 'GlobalConfig', 'InventoryItem', 'Mode', 'OptionChoice',
      'OptionGroup', 'Order', 'OrderItem', 'OrderStatus', 'PaymentMethod',
      'PaymentStatus', 'Product', 'Selections', 'Station',
    ])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. THE DATA MODEL GAP SHARED BY ALL THREE CRITERIA (§3)
//
// Spec §3 adds five collections. Two were built (`messages`, `presence` — proved
// by `alert` and `hq`). Three were not, and they are exactly the three that the
// three remaining criteria are made of.
// ════════════════════════════════════════════════════════════════════════════
describe('D. §3 data model — three of the five new collections were never created', () => {
  /** D1 — GAP. §3 declares `/pricingOverrides/{boothId}`, `/passports/{code}`
   *  and `/cashSessions/{id}`. None is read or written anywhere. */
  test('D1: GAP §3 — pricingOverrides, passports and cashSessions are never used', () => {
    const declared = ['pricingOverrides', 'passports', 'cashSessions']
    expect(declared.filter((c) => collectionsUsed().includes(c))).toStrictEqual([])
    // and the names appear nowhere in production source at all, not even in a comment
    expect(filesMentioning(declared)).toStrictEqual([])
  })

  /** D2 — GAP. §3 gives each of the three a document shape. `domain/types.ts` has
   *  a type for every persisted shape the app does use (Order, Expense, …) and
   *  none for these three. There is nothing for a builder to fill in. */
  test('D2: GAP §3 — no TS type describes any of the three document shapes', () => {
    const types = exportedTypes('src/domain/types.ts')
    expect(types.filter((t) => /pricing|override|passport|stamp|cash ?session/i.test(t)))
      .toStrictEqual([])
    // control: the same filter DOES find the shapes that exist
    expect(types.filter((t) => /^(Order|Expense|Product)$/.test(t)))
      .toStrictEqual(['Expense', 'Order', 'Product'])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// H. §4.3 HAPPY-HOUR PRICING — four clauses, three absent, one already built
// ════════════════════════════════════════════════════════════════════════════
describe('H. §4.3 Happy-Hour — clause by clause', () => {
  /** H1 — CLAUSE "HQ toggle → pricingOverrides/{boothId}.active=true + priceMap".
   *  GAP: absent. §7 also lists a "Happy-Hour panel" on HQ; the Dashboard has no
   *  such control. */
  test('H1: GAP §4.3 — nothing toggles a price override, and HQ has no panel for it', () => {
    expect(filesMentioning(['pricingOverride', 'priceMap', 'happy.?hour'])).toStrictEqual([])
    // the HQ screen exists and is non-trivial — so its silence is a real absence,
    // not an empty file
    const hq = read('src/screens/DashboardScreen.tsx')
    expect(hq.length).toBeGreaterThan(500)
    expect(/override|priceMap/i.test(hq)).toBe(false)
  })

  /**
   * H2 — CLAUSE "Order Station: ตอนคำนวณ subtotal ถ้า override active … ใช้ราคา
   * override". GAP: the pricing pipeline is a PURE FUNCTION OF THE CATALOGUE with
   * no third input. There is no seam an override could enter through.
   *
   * This is pinned as the literal source of `lineUnitPrice` rather than a word
   * search, because the absence here is structural: two parameters, and a body
   * that reads `product.price`. A third parameter is what "somebody built it"
   * looks like.
   *
   * 📌 There are exactly TWO call sites and BOTH must change for the clause to be
   * met — S1's census fixes the set at three files (the definition plus these
   * two). `cart.ts` decides the price PERSISTED on the order; `OrderStation.tsx`
   * independently recomputes the price SHOWN to the customer on the line item.
   * A Happy-Hour implementation that threads an override through only one of them
   * charges a price the screen never displayed, or displays one it never charged.
   */
  test('H2: GAP §4.3 — unit price is computed from the catalogue alone', () => {
    const options = read('src/order/options.ts')
    expect(options).toContain('export function lineUnitPrice(product: Product, selections: Selections): number {')
    expect(options).toContain('return product.price + optionPriceDelta(product, selections)')

    // both callers pass exactly those two arguments — no seam for an override
    expect(read('src/order/cart.ts')).toContain('const unitPrice = lineUnitPrice(p, l.selections)')
    expect(read('src/screens/OrderStation.tsx')).toContain('{lineUnitPrice(p, line.selections) * line.qty}฿')
  })

  /** H3 — CLAUSE "Display: ถ้า active → ขึ้นป้าย label". GAP: absent. The label
   *  catalogue is the app's single source of on-screen wording; it has 78 entries
   *  and none of them is a promo banner. */
  test('H3: GAP §4.3 — Display has no Happy-Hour banner, and no label exists for one', () => {
    const labels = read('src/i18n/labels.ts')
    // census of the input set: 76 bilingual entries. Counted as `{ th: '` — the
    // opening of an entry — not as `th:`, which also matches the `{ th: string }`
    // return annotation on nowServingLabel() and would report 79.
    expect(labels.match(/\{ th: '/g)?.length).toBe(76)
    expect(labels.match(/': \{/g)?.length).toBe(76)
    expect(/happy|promo|ลดราคา/i.test(labels)).toBe(false)
    expect(/happy|promo/i.test(read('src/screens/DisplayScreen.tsx'))).toBe(false)
  })

  /**
   * H4 — CLAUSE "order บันทึก unitPrice จริงที่ใช้ลง order เพื่อให้ audit ตรง".
   * ⚠️ THIS CLAUSE IS ALREADY SATISFIED — and it is the reason this criterion
   * must not be reported as "nothing exists".
   *
   * Every order line persists the unit price actually charged, so the audit trail
   * §4.3 asks for is in place TODAY. What is missing is only the override that
   * would make that number differ from the catalogue price. A builder adding
   * Happy-Hour does not need to touch the order schema.
   */
  test('H4: EXISTS §4.3 — every order line already persists the unit price charged', () => {
    expect(read('src/domain/types.ts')).toContain('  unitPrice: number')
    expect(read('src/order/cart.ts')).toContain(
      'const item: OrderItem = { sku: p.sku, name: p.name, qty: l.qty, unitPrice, subtotal: unitPrice * l.qty }',
    )
  })
})

// ════════════════════════════════════════════════════════════════════════════
// C. §4.5 CASH RECONCILIATION — the half-built criterion
//
// 📌 `expectedCash` exists. Do not read that as "nearly done": it is one of four
// clauses, and it is the one clause that needs no work.
// ════════════════════════════════════════════════════════════════════════════
describe('C. §4.5 cash reconciliation — clause by clause', () => {
  /** C1 — CLAUSE 'ปุ่ม "ปิดซุ้ม" ที่ Order Station (หรือ HQ)'. GAP: absent from
   *  both screens named by the spec. */
  test('C1: GAP §4.5 — neither Order Station nor HQ has a close-booth control', () => {
    expect(filesMentioning(['ปิดซุ้ม', 'closeBooth', 'close.?booth', 'closedAt'])).toStrictEqual([])
    // both named screens exist and are substantial — the absence is theirs, not a
    // missing file
    expect(read('src/screens/OrderStation.tsx').length).toBeGreaterThan(500)
    expect(read('src/screens/DashboardScreen.tsx').length).toBeGreaterThan(500)
  })

  /**
   * C2 — CLAUSE "ระบบคำนวณ expectedCash = Σ orders(paid, paymentMethod:'cash')".
   * ⚠️ ALREADY SATISFIED, and already on screen. Pinned positively so nobody
   * rebuilds it.
   */
  test('C2: EXISTS §4.5 — expectedCash is computed and already rendered on HQ', () => {
    const metrics = read('src/dashboard/metrics.ts')
    expect(metrics).toContain("if (order.paymentMethod === 'cash') {")
    expect(metrics).toContain('expectedCash += order.total')
    expect(read('src/screens/DashboardScreen.tsx')).toContain('testid="expected-cash"')
  })

  /**
   * C3 — SUB-GAP inside the built half. §4.5 says expectedCash is "ของ scope นั้น"
   * — per booth, and the document shape in §3 carries `boothId` and `station`.
   * The implementation returns ONE SCALAR across every order it is handed.
   * `byBooth` proves the codebase knows how to split by booth and simply does not
   * do it here.
   *
   * So the existing number is right for "the whole event" and wrong for "this
   * till". A builder must not assume C2 can be reused as-is.
   */
  test('C3: GAP §4.5 — expectedCash is one global scalar, not per booth or station', () => {
    const metrics = read('src/dashboard/metrics.ts')
    expect(metrics).toContain('  expectedCash: number')                 // scalar…
    expect(metrics).toContain('  byBooth: Record<BoothId, number>')     // …beside a per-booth field
    expect(/expectedCash[^\n]*Record</.test(metrics)).toBe(false)
    expect(/station/i.test(metrics)).toBe(false)
  })

  /** C4 — CLAUSE "กรอก countedCash → บันทึก cashSessions พร้อม diff". GAP: none of
   *  the three exists. This is the whole of the criterion's second half. */
  test('C4: GAP §4.5 — no countedCash input, no cashSession record, no diff', () => {
    expect(filesMentioning(['countedCash', 'cashSession', 'reconcil'])).toStrictEqual([])
    // "diff" as a standalone identifier, not as a substring of "different"
    expect(filesMentioning(['\\bdiff\\b'])).toStrictEqual([])
  })

  /**
   * C5 — CROSS-REFERENCE, not a fresh judgement. `donation F3` already recorded
   * that this codebase's money count deviates from the spec's literal formula by
   * also excluding `status:'cancelled'`, and deliberately left BOTH numbers
   * pinned for a human to decide. `expectedCash` is computed inside that same
   * `isRevenue` guard, so §4.5 inherits the identical deviation.
   *
   * 🚫 Do not re-adjudicate it here. This test only pins that the two criteria are
   * still talking about the same line of code, so the decision stays single.
   */
  test('C5: §4.5 inherits the donation F3 deviation — same isRevenue guard', () => {
    const metrics = read('src/dashboard/metrics.ts')
    expect(metrics).toContain("return o.paymentStatus === 'paid' && o.status !== 'cancelled'")
    // expectedCash accumulates behind that guard, not beside it
    const body = metrics.slice(metrics.indexOf('for (const order of orders)'))
    expect(body).toContain('if (!isRevenue(order)) continue')
    expect(body.indexOf('if (!isRevenue(order)) continue'))
      .toBeLessThan(body.indexOf('expectedCash += order.total'))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// P. §4.6 3-ซุ้ม PASSPORT — five clauses, all absent
// ════════════════════════════════════════════════════════════════════════════
describe('P. §4.6 passport — clause by clause', () => {
  /**
   * P1 — CLAUSE "ออก code + QR ให้ลูกค้า (สร้างฝั่ง client, ทำงาน offline)".
   * GAP: absent — with a trap. A QR component DOES exist, and a grep for "QR"
   * would call this clause done. It renders the PromptPay payment code and
   * nothing else: it takes a `payload` string from its caller and its only
   * caller is the payment flow.
   */
  test('P1: GAP §4.6 — the only QR in the app is PromptPay, not a passport code', () => {
    const qr = read('src/order/QrCode.tsx')
    expect(qr).toContain('alt="PromptPay QR"')
    expect(/passport|stamp|code\s*:/i.test(qr)).toBe(false)
    // no passport-code issuer anywhere
    expect(filesMentioning(['passportCode', 'issueCode', 'stampCode'])).toStrictEqual([])
  })

  /** P2 — CLAUSE "สแกน/กรอก code → เพิ่ม boothId เข้า stampedBooths". GAP: absent. */
  test('P2: GAP §4.6 — nothing scans a code or records a stamp', () => {
    expect(filesMentioning(['stampedBooths', 'passport', '\\bstamp'])).toStrictEqual([])
  })

  /**
   * P3 — CLAUSE "กันซ้ำ: ถ้ามี boothId แล้ว ไม่เพิ่ม", i.e. the (code, boothId)
   * idempotency in §5.4. GAP: absent.
   *
   * 📌 Note this is a DIFFERENT idempotency from the one that exists. The queue's
   * duplicate-press guard was built and proved (`idempotency`), and it is a
   * per-panel `useRef` Set over queue actions — it has nothing to do with stamps
   * and could not be reused. `arrayUnion`, which is how §5.4's dedupe would most
   * naturally be written, is used only for message acks.
   */
  test('P3: GAP §4.6 — no stamp dedupe; the one arrayUnion in the app is for acks', () => {
    expect(filesMentioning(['arrayUnion'])).toStrictEqual(['src/comms/commsRepo.ts'])
    expect(read('src/comms/commsRepo.ts')).toContain('ackBy: arrayUnion(')
  })

  /** P4 — CLAUSE "ครบ 3 ซุ้ม → ขึ้น '🎉 ครบ 3 ซุ้ม! ลุ้นรางวัล' → กดรับ →
   *  rewardClaimed=true". GAP: absent from every screen and from the labels. */
  test('P4: GAP §4.6 — no reward prompt, no claim action', () => {
    expect(filesMentioning(['rewardClaimed', 'reward', 'ลุ้นรางวัล', 'รางวัล'])).toStrictEqual([])
  })

  /**
   * P5 — CLAUSE "Offline-safe: แสตมป์เขียน local persistence, sync ทีหลัง".
   * GAP: absent, and already recorded from the other side — `offlineSync G2` pins
   * that §5.4 describes offline behaviour for a feature with no code. Cited here
   * rather than re-proved; this test only holds the two files to the same claim so
   * they cannot drift apart.
   */
  test('P5: GAP §4.6 — offlineSync G2 pins the same absence; both still agree', () => {
    expect(filesMentioning(['passport', 'stampedBooths'])).toStrictEqual([])   // G2's exact assertion
    expect(read('src/offlineSync.audit.test.tsx'))
      .toContain("expect(filesMentioning(['passport', 'stampedBooths'])).toStrictEqual([])")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// R. WHAT A BUILDER NEEDS TO KNOW BEFORE STARTING
//
// Not gaps — facts that decide how much work these three actually are. Recorded
// because the next round's scope decision depends on them.
// ════════════════════════════════════════════════════════════════════════════
describe('R. groundwork that already exists for whoever builds these', () => {
  /**
   * R1 — The security rules are a single wildcard with a date lock, so the three
   * new collections need NO rules change. That matters: `firestore.rules` is on
   * the Out-of-scope list, and a builder could reasonably assume these features
   * were blocked behind an edit they are not allowed to make. They are not.
   *
   * ⚠️ The lock date is a real operational deadline, pinned so it cannot pass
   * unnoticed: after it, every read and write is denied.
   */
  test('R1: firestore.rules admits any collection until the date lock', () => {
    const rules = read('firestore.rules')
    expect(rules).toContain('match /{document=**} {')
    expect(rules).toContain('allow read, write: if request.time < timestamp.date(2026, 9, 30);')
    // exactly one rule — no per-collection allow-list to extend
    expect(rules.match(/allow /g)?.length).toBe(1)
  })

  /** R2 — `donationTarget` is declared on GlobalConfig and read by nobody. It is
   *  the one piece of the remaining work already modelled. `donation T1` pins the
   *  same fact from the thermometer's side; kept here so the builder of §4.3–§4.6
   *  sees it without reading that file. */
  test('R2: donationTarget is modelled but unread — the only pre-modelled field', () => {
    expect(read('src/domain/types.ts')).toContain('  donationTarget?: number')
    expect(filesMentioning(['donationTarget'])).toStrictEqual(['src/domain/types.ts'])
  })
})
