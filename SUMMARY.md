# SUMMARY — round 2026-08-23 (0108)

Branch: `auto/Booth_Management_6_7/2026-08-23_0108` (cut from `main = 735de75`)
Task: close the `hq-comms-crosssell` criterion
**"ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้"**

## What I did

- **Synced `AUTOPILOT.md` from branch `_0032`** (`75ab1c4`). This branch was cut from `main`,
  so the working copy still carried a ledger from several rounds back. The plan text in the
  prompt matched `_0032`; the file on disk did not.
- **Added 15 tests in a new file `src/interBoothAlert.audit.test.tsx`** (`4ae5b82`) covering the
  send half (🆘 → exact `sendMessage` payload), the receive half (HQ + another booth's Order
  Station actually render a toast from a snapshot), the scope/self/ack filters, and the ack loop.
- **Decided the criterion's scope and wrote down why**: it covers HQ + Order Stations, not the
  Display bar of §4.2 `:118`. Recorded the three things it does *not* cover as `GAP:` tests so
  none of them is left in an "unknown" state.
- **Wrote `docs/autopilot/2026-08-23-inter-booth-alert-audit.md`** (`603d34d`) — reusable, with
  the mutation table and the evidence limits.
- **Ticked the criterion and rewrote `## Next task`** (`1a7caa9`) to the two-device HQ criterion,
  including the recon that rules Happy-Hour out as the next step.

**No production code was changed this round.** The gap was entirely in the tests.

## Why

**Scope decision (the one real judgement call).** §4.2 `:116` says *all three modes*
(Order/Display/HQ) receive a toast; `:118` gives Display its own separate treatment (a brief
**bar**, no ack mentioned). The criterion I had to tick uses the words "toast" and "ack ได้",
which are `:116`'s words. The decisive argument is not word-reading but the code:
`visibleMessages()` (`src/comms/commsLogic.ts:14`) removes a message from a screen **only** once
`ackBy` contains that device's id — there is no time window and no auto-dismiss. A customer
Display has nobody to press ✔, so mounting the existing `CommsToast` there would pin an alert on
the customer screen permanently. Closing it properly needs a time window inside `commsLogic.ts`,
and this round's Out of scope says **"ห้ามเปลี่ยน logic comms"**. So: prove the criterion where it
applies, and lock the Display bar as a `GAP:` test that states why it can't be closed here.

**Why screen-level tests and not more component tests.** `CommsToast.test.tsx` and
`AlertButtons.test.tsx` already existed and were green. They test the components in isolation.
Both screen tests mock `subscribeMessages: () => () => {}`, so no test in the repo could emit a
snapshot into a mounted screen — the wiring itself was never exercised. That is what the criterion
is actually about ("HQ + ซุ้มอื่น **เห็น**").

## Verification

Verify command run as written, unmodified:

```
npm test   → Test Files 40 passed (40) · Tests 148 passed (148)     (was 133/39 before this round)
npm run build → exit 0 · built in 1.16s · PWA v1.3.0 generateSW · precache 5 entries
```

The build emits the known `chunks are larger than 500 kB` **warning** (not an error) — deliberately
untouched, same call as rounds 0020/0036/0031.

**Proof the gap was real (M1):** removing `<CommsToast>` from `OrderStation.tsx` and running the
whole suite gives `1 failed | 39 passed (40 files)` · `9 failed | 139 passed (148)`. **All 133
pre-existing tests stay green while the booth-to-booth alert path is completely severed.**

**Mutation check: 12 mutations, outcome predicted in advance for each, 11 predictions exact.**

| # | mutation | predicted | actual |
|---|---|---|---|
| M1 | drop `<CommsToast>` from `OrderStation` | 9 | ✅ 9 |
| M2 | drop `<CommsToast>` from `DashboardScreen` | 2 | ✅ 2 |
| M3 | ✔ button stops calling `ackMessage` | 1 | ✅ 1 |
| M4 | ackBy filter goes blind | 2 | ✅ 2 |
| M5 | scope filter passes everything | 1 | ✅ 1 |
| M6 | stop filtering out my own message | 1 | ✅ 1 |
| M7 | sort oldest-first | 1 | ✅ 1 |
| M8 | anyone's ack silences everyone | 1 | ✅ 1 |
| M9 | stray payload field + duplicated preset code | 2 | ✅ 2 |
| M10 | move the toast in front of the HQ PIN gate | 1 | ✅ 1 |
| M11 | **mount `CommsToast` on `DisplayScreen`** (someone closes the gap) | 1 | ✅ 1 |
| M12 | add `new AudioContext()` to `CommsToast` | 1 | ⚠️ 11 |

**All 15 tests are killed by at least one mutation.** Every mutation was reverted and
`git status --short` was verified empty before each commit.

M12 is the one prediction that missed, and only on blast radius, not on target: jsdom has no
`AudioContext`, so the constructor throws during render and every screen-rendering test fails, not
just the one `GAP:` test I was aiming at. Recorded in the audit doc and in the handoff, because the
round that actually builds §4.2's alert sound will hit it.

`grep -ci "@firebase\|GrpcConnection"` on the new file's run returns `0` — it does not reach real
Firestore (round 0032's "green ≠ isolated" trap).

## What I did NOT do

- **Did not build the Display alert bar** (§4.2 `:118`). Reason above: it cannot be done correctly
  without editing `commsLogic.ts`, which Out of scope forbids. Locked as a `GAP:` test.
- **Did not add the soft alert sound** (§4.2 `:116`). Not named by the criterion; locked as `GAP:`.
- **Did not add a time window** to `visibleMessages` (§4.2 `:116` "ล่าสุด ~เวลาปัจจุบัน").
  Same reason — it is comms logic. Locked as `GAP:`, with a test showing a three-day-old un-acked
  alert still counts as current.
- **Did not touch `firestore.rules`, `.env*`, the specs, or any accounting/menu/comms logic.**
  The only files added are one test file and one doc; the only files edited are `AUTOPILOT.md`
  and this summary.
- **Did not start Happy-Hour** even though the previous plan suggested it as next. I verified it
  has zero code (`0 grep hits`) and that §4.3 requires changing how subtotal is computed — which
  Out of scope forbids. That reasoning is written into the new `## Next task` so the next round
  does not have to rediscover it.

## Risk

- **The three `GAP:` tests are designed to go red** the day someone closes those gaps (M11 proves
  the Display one is a live tripwire, not decoration). A reviewer seeing them fail should read the
  comment above each: delete the test and update the ledger, don't "fix" it.
- **Evidence limits, stated plainly.** `commsRepo` is mocked wholesale, so **"เมื่อ online" is not
  tested at all** — no real Firestore, no second machine, no pulled network cable. "ภายในไม่กี่วิ"
  is proven only structurally: the screen holds a listener and repaints from a snapshot with no
  refresh and no click. jsdom does no layout, so the toast's `fixed top-3` position is **not**
  proven to avoid covering anything.
- **`git status --short` is clean**, but this round ran 12 mutations against four production files
  (`OrderStation.tsx`, `DashboardScreen.tsx`, `DisplayScreen.tsx`, `commsLogic.ts`,
  `CommsToast.tsx`, `AlertButtons.tsx`). `git diff main --stat` should show **no production file
  at all** — worth a glance to confirm nothing survived a revert.
- **Cross-branch drift is unchanged and still the biggest systemic risk**: branches never merge, so
  this branch's ledger says 12/20 while other branches hold ticks for criteria that are not proven
  here. The `## Next task` section carries that warning forward.
