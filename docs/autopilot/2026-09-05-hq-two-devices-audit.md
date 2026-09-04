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

## 5. Measured result

*(filled in after the run — see the commit that follows)*
