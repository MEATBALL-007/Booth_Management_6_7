# HQ on two machines — audit (round `_2026-09-05_0047`)

Criterion (`2026-07-24-hq-comms-crosssell-design.md`, hq-comms 1 of 7):

> HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime;
> ปิดเครื่องนึง อีกเครื่องทำงานครบ

Evidence: `src/hqTwoDevices.audit.test.tsx`, 22 tests.
**No `src/` production code changed this round.** The screen already satisfies
every clause the criterion states; what was missing was the evidence.

---

## 1. What the spec actually asks for

Three passages carry the requirement:

| § | text | where it lands |
|---|---|---|
| 22 | HQ = 2 เครื่อง (MacBook + Windows 11) **เหมือนกันทุกอย่าง** เป็น backup ของกัน — **ไม่ต้องมี backup logic** | the whole design |
| 98 | **2 เครื่องเหมือนกันทุกปุ่ม** (ทั้งคู่ view + export + broadcast + control ได้ครบ) | group P, gap G0 |
| 157 | `presence` heartbeat หยุดตอน offline → HQ เห็นเป็น "หลุด" ถูกต้อง | group H |

§22's "ไม่ต้องมี backup logic" is the load-bearing sentence. The design's answer
to redundancy is that **HQ is a stateless reader**, so a second browser tab *is*
the backup. That makes the criterion provable by construction — but only if
nothing in the screen branches on which machine it is (group P), and only if
closing one machine releases exactly that machine (group S).

---

## 2. How the file is wired

"Two machines" is **two `render()` calls that are both mounted at once**. This
differs deliberately from `alertToast.audit` (`_0027`), which unmounts between
devices because it only ever needed one live screen. Here simultaneity *is* the
criterion.

- Both instances share one jsdom `document`, so `screen.getByTestId` would match
  both and throw. Every assertion is scoped with `within(machine.container)`.
  Nothing reads `document.body.firstElementChild` — that is Testing Library's own
  wrapper and belongs to neither machine.
- Device identity is `localStorage['phantom.deviceId']`, read by `getDeviceId()`
  in `DashboardScreen`'s render body. Each machine mounts while that key holds
  its own value.
- Fake timers are on file-wide with `vi.setSystemTime(T0)`. `useHeartbeat` runs on
  `setInterval` and `PresenceBoard` reads `Date.now()` at render, so a held clock
  lets H0 pin the heartbeat payload with `toStrictEqual` down to `lastSeen`.
  ⚠️ `vi.useFakeTimers()` also fakes `Date`, which silently clobbers a
  hand-installed `Date.now` **spy**. This file uses `setSystemTime` and never a
  spy, which is why the two do not collide here.

### The central trap

The repos are mocked at the **subscription boundary**, and the mock's unsubscribe
**splices the callback out of the registry**, exactly as a real `onSnapshot`
teardown stops delivery. The registry therefore *is* the live set.

If the mock instead kept one array and emitted to all of it forever, then after a
machine closes the test would still be feeding the **dead** instance — and group S
would pass without ever showing that the survivor received anything. Two guards:

- **W0** pins the removal, driving the mocked module directly with no React.
- **S2** asserts the **delivery count**, because W0 alone would not stop the emit
  helper from keeping its own shadow list and feeding ghosts anyway.

S2's count assertion was **added during mutation planning**, when M16 showed the
emit path was unpinned. That is the check earning its keep before it was run.

---

## 3. The 22 tests

| group | clause | tests |
|---|---|---|
| **W** | the harness itself | W0 unsubscribe forgets · W1 two distinct live subscribers |
| **P** | §98 เหมือนกันทุกปุ่ม | P0 PinGate canary · P1 buttons · P2 fields · P3 different ids, same surface |
| **D** | เห็นข้อมูลตรงกัน | D0 tile census · D1 one snapshot · D2 a new order · D3 expenses · D4 late joiner |
| **S** | ปิดเครื่องนึง ทำงานครบ | S1 releases its own · S2 survivor repaints · S3 keeps controls · S4 still writes · S5 still broadcasts |
| **H** | §157 presence | H0 own heartbeat · H1 closed goes quiet · H2 หลุด vs ออนไลน์ · H3 locked never beats |
| **G** | recorded gaps | G0 no export · G1 indistinguishable rows |

---

## 4. Mutation table — **predicted BEFORE running** (§5 holds the measured result)

Twenty mutations. The predicted column lists only `hqTwoDevices` tests; sibling
audits are collateral and recorded separately in §5.

Known collateral rule, from `_0037`/`_0038`: touching **any** production file
reddens `frozenZones P1` (the file is not in `PRODUCTION_CHANGES`), and touching a
**frozen** one (`useHeartbeat.ts`, `commsLogic.ts`, `metrics.ts`, `pinStore.ts`)
also reddens `frozenZones F2`. `PresenceBoard.tsx` and `BroadcastBar.tsx` are
`.tsx`, and `FROZEN_DIR` only matches `.ts`, so they are P1-only.

| # | file | mutation | predicted red |
|---|---|---|---|
| M1 | `DashboardScreen.tsx` | heartbeat loses its `unlocked ?` gate — always beats | H3 |
| M2 | `DashboardScreen.tsx` | presence `id: getDeviceId()` → `id: 'hq'` (both machines collide on one doc) | H0 |
| M3 | `useHeartbeat.ts` | drop `return () => clearInterval(timer)` | H1 |
| M4 | `useHeartbeat.ts` | `HEARTBEAT_MS` 30_000 → 300_000 | H1 |
| M5 | `DashboardScreen.tsx` | cleanup drops `u2()` — the expense sub leaks | S1 |
| M6 | `DashboardScreen.tsx` | effect returns no cleanup at all | S1, S2 |
| M7 | `DashboardScreen.tsx` | remove the `subscribeAllExpenses` wiring | W1, D3, S1 |
| M8 | `PresenceBoard.tsx` | `const now = Date.now()` → `const now = 0` (everything reads online) | H2 |
| M9 | `commsLogic.ts` | `isOnline` returns `true` always | H2 |
| M10 | `DashboardScreen.tsx` | remove `<PresenceBoard />` | W1, H2, G1 |
| M11 | `BroadcastBar.tsx` | `fromDeviceId: getDeviceId()` → `'hq'` | S5 |
| M12 | `DashboardScreen.tsx` | drop the `addExpense(payload)` call | S4 |
| M13 | `metrics.ts` | `netDonation: totalSales - totalCost` → `totalSales` | D3 |
| M14 | `DashboardScreen.tsx` | delete the `expected-cash` tile | D0, D1, D2, D3, D4, P3 |
| M15 | **test file** | `subscription()`'s unsubscribe becomes a no-op (registry never forgets) | W0, S1, S2 |
| M16 | **test file** | `deliver()` walks more than the live set (`[...registry, ...registry]`) | S2 |
| M17 | `pinStore.ts` | `isDashboardUnlocked` returns `true` always | P0, H3 |
| M18 | `DashboardScreen.tsx` | render Save only when `getDeviceId() === 'hq-macbook'` — a §98 violation | P1, P3, S4 |
| M19 | `DashboardScreen.tsx` | remove `<BroadcastBar />` | P1, P2, S5 |
| M20 | `DashboardScreen.tsx` | introduce a `URL.createObjectURL` export path | G0 |

**Predictions that matter most**

- **M14** is expected to kill six tests. D0 is not the only one that notices a
  missing tile, but it is the only one that *names* the census — the others die
  because `tiles()` throws. If D0 alone survived a tile deletion, the "all eight"
  claim would be a claim about the loop rather than about the screen.
- **M15 and M16 are the checker-blinding pair.** This is the sixth round of this
  species (`neon G1`, `pwa V1`, `fz F2`, `rtt T3`, `donation T2`), and the first
  where the blindness lives in a *subscription registry* rather than a regex.
- **M18** is the only mutation that models the §98 failure directly: a machine
  with a control the other lacks. If group P cannot kill it, group P is decoration.

---

## 5. Measured result — round `_2026-09-06_0007`

Baseline before every row: **56 files · 395 tests · 0 failed**, and every row's
tally matched 395, so no row silently dropped a test file.

Harness: `C:/PHANTOM-AUTOPILOT/mutate-0007.mjs`, **kept outside the repo** — an
untracked script at the repo root classifies as `'unknown'` in
`frozenZones.changedPaths()` and would redden `fz C1` + `ds S2` on all twenty
rows (`_0027` measured exactly that). Each row is
`git checkout -- .` → anchor replace (**throw unless exactly one match**) →
`vitest run --reporter=json` → parse → `git checkout -- .`.

**Prediction accuracy: 16 of 20 exact.** The `hq` column is this file's tests;
`other` is collateral.

| # | predicted | measured `hq` | ✓ | collateral |
|---|---|---|---|---|
| M1 | H3 | H3 | ✓ | `fz P1` |
| M2 | H0 | H0 | ✓ | `fz P1` |
| M3 | H1 | H1 | ✓ | `fz F2` `fz P1` `ds S2` · `useHeartbeat.test` stops-on-unmount |
| M4 | H1 | H1 | ✓ | `fz F2` `fz P1` `ds S2` · `useHeartbeat.test` every-30s |
| M5 | S1 | **S1 S2** | ✗ | `donation U5` `fz P1` |
| M6 | S1 S2 | S1 S2 | ✓ | `donation U5` `fz P1` |
| M7 | W1 D3 S1 | **W1 D3 S1 S2** | ✗ | `DashboardScreen.test` net-donation · `donation T2/U0/U1/U2/U5` `fz P1` |
| M8 | H2 | H2 | ✓ | `PresenceBoard.test` · `fz P1` |
| M9 | H2 | H2 | ✓ | `PresenceBoard.test` · `alertToast C4` · `commsLogic.test` 90s · `fz F2` `fz P1` `ds S2` |
| M10 | W1 H2 G1 | W1 H2 G1 | ✓ | `DashboardScreen.test` presence-board · `fz P1` |
| M11 | S5 | S5 | ✓ | `BroadcastBar.test` · `fz P1` |
| M12 | S4 | S4 | ✓ | `DashboardScreen.test` ×2 · `fz P1` |
| M13 | D3 | **D3 S2** | ✗ | `DashboardScreen.test` · `donation F1/F3/F4/F5/T2/T4/U0/U1/U2` · `metrics.test` · `fz F2` `fz P1` `ds S2` |
| M14 | D0 D1 D2 D3 D4 P3 | **D0 D1 D2 D3 D4 P3 S2 S3** | ✗ | `DashboardScreen.test` · `fz P1` |
| M15 | W0 S1 S2 | W0 S1 S2 | ✓ | **none** |
| M16 | S2 | S2 | ✓ | **none** |
| M17 | P0 H3 | P0 H3 | ✓ | `App.test` · `DashboardScreen.test` PIN gate · `pinStore.test` ×4 · `fz F2` `fz P1` `ds S2` |
| M18 | P1 P3 S4 | P1 P3 S4 | ✓ | `DashboardScreen.test` ×2 · `fz P1` |
| M19 | P1 P2 S5 | P1 P2 S5 | ✓ | `fz P1` |
| M20 | G0 | G0 | ✓ | `alertToast B5` · `neon G8` · `rtt T1/X3/X4` · `fz P1` |

### The four misses share one root cause, and it is **S2**

Every miss is in the same direction — an extra test died — and in three of the
four it is S2 alone. The prediction treated S2 as "the survivor repaints". It is
not. S2 asserts **three separate things**:

1. the dead machine's callback left the registry,
2. `emitOrders`/`emitExpenses` each returned a **delivery count of exactly 1**,
3. three **tile values** on the survivor.

Clause 2 makes S2 a canary for all subscription bookkeeping (M5 leaks the expense
sub, M7 removes it), and clause 3 makes it a canary for tile arithmetic (M13
changes the net formula, M14 deletes a tile). That is lesson (ก) from the
handoff — *a test that asserts a clean baseline first dies with every mutation
that breaks the baseline* — and the prediction failed to apply it to a test whose
**name** advertises only one of its three clauses.

📌 S2's clause 2 was added during `_0047`'s mutation *planning*, and M16 confirms
it earns its keep: `deliver()` walking `[...registry, ...registry]` is caught by
**S2 alone, in all 395 tests**. Without clause 2 that mutation had no killer.

M14's two unpredicted victims come from a different mechanism: `tiles()` loops
`TILE_IDS` with `getByTestId`, which **throws** on a missing tile. So deleting
`expected-cash` kills every test that calls `tiles()` at all — including S3,
which never mentions that tile. See §6 for why that matters.

### Collateral rules held exactly as §4 stated them

- every production-file mutation → `fz P1` (none of these files is in
  `PRODUCTION_CHANGES`) — 18 of 18;
- frozen **`.ts`** (`useHeartbeat` `commsLogic` `metrics` `pinStore`) → **also**
  `fz F2` + `ds S2` — M3 M4 M9 M13 M17;
- **`.tsx`** in `comms/` (`PresenceBoard` `BroadcastBar`) → `fz P1` **only**,
  confirming `_0027`'s refinement that `.tsx` is classed `presentation` by path
  and does not move `ds S2` — M8 M11;
- **test-file** mutations → **zero collateral** — M15 M16.

M20 reproduces the documented line-insertion species precisely: adding lines to
`DashboardScreen.tsx` reddens `alert B5` · `neon G8` · `rtt T1/X3/X4`, which is
the exact set `_0008` recorded. Those audits pin `file:line`, and that is
deliberate.

---

## 6. Killer census — measured, not predicted

| killers | tests |
|---|---|
| 0 | **none** |
| 1 | **W0**(M15) · **P0**(M17) · **P2**(M19) · **D0**(M14) · **D1**(M14) · **D2**(M14) · **D4**(M14) · **S3**(M14) · **H0**(M2) · **G0**(M20) · **G1**(M10) |
| 2 | W1 P1 P3 S4 S5 H1 H3 |
| 3 | D3 H2 |
| 4 | S1 |
| 7 | S2 |

⚠️ **Every one of the 22 tests has at least one killer.** No test in this file is
vacuous. The eleven single-killer tests **must not be deleted**.

### 🚨 But the census hides a real weakness, and it is the D group

Five of the eleven single-killer tests — **D0 D1 D2 D4 S3** — are killed only by
**M14**, and M14 kills them by making a *helper throw*, not by breaking the
property each test claims to check. D1/D2/D4 all claim some form of *"both
machines agree"*. **No mutation among M1–M20 makes the two machines disagree.**

That is not an accident of the table; it is a consequence of the design. §22's
"ไม่ต้องมี backup logic" means HQ is a stateless reader, so two instances fed one
snapshot agree **by construction**. The risk is that the D group could be
asserting a tautology and nobody would notice, because the mutation that would
expose it was never written.

**M21 was added to answer exactly that question.** Its prediction was committed
before it was run, in the commit that carries this paragraph.

---

## 7. M21 — does the D group detect *disagreement*, or only *absence*?

| # | file | mutation |
|---|---|---|
| M21 | `DashboardScreen.tsx` | the machine whose `getDeviceId() === 'hq-windows'` reports `totalSales: 0`; every other figure, tile and control is untouched |

One line replaced by one line — no line-count change, so no `file:line` canary in
a sibling audit should move.

**Predicted red — `hq`:** D1 · D2 · D3 · D4 · S2 · S3
**Predicted red — collateral:** `fz P1` only.

Reasoning, per test, read off the accessors rather than guessed:

- **D1** asserts `tiles(win)` `toStrictEqual` a hand-computed map with
  `total-sales: '420฿'` → sees `'0฿'` → red.
- **D2** asserts `tiles(win)['total-sales']` at both `'420฿'` and `'670฿'` → red.
- **D3** never names `total-sales`, but ends on
  `expect(tiles(mac)).toStrictEqual(tiles(win))` → red **through the cross-machine
  clause**, which is the clause under examination.
- **D4** — its `'0฿'` line stays *true* under the mutation; it dies on the later
  `expect(tiles(win)).toStrictEqual(tiles(mac))` → red.
- **S2** and **S3** both read `tiles(win)['total-sales']` expecting `'670฿'`,
  and `win` is the mutated machine → red.
- **D0** reads tile **names** on `mac` only → green. **P group** reads buttons and
  fields, not tiles → green. W · H · G → green.
- `DashboardScreen.test.tsx` and `donationThermometer` mount with the default
  device id, never `'hq-windows'` → green.

If D1/D2/D4 were tautologies, they would survive this. §8 records what happened.
