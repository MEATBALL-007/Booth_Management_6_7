# Round summary — 2026-08-22 (0031)

**Branch:** `auto/Booth_Management_6_7/2026-08-22_0031` (cut fresh from `main` = `735de75`)
**Task:** spec `2026-08-03-ui-overhaul-design.md` §8 — *"tests เขียวครบ + `npm run build` ผ่าน + PWA generate"*
**Outcome:** ✅ criterion audited and **ticked**. No production code changed.

---

## What I did

- **Audited all three sub-claims and ticked the criterion.** Ran both commands myself:
  `133 tests / 39 files` green before starting, `144 / 40` after adding this round's file;
  `npm run build` exit 0; `PWA v1.3.0 / mode generateSW / precache 5 entries` emitting
  `dist/sw.js`, `workbox-*.js`, `manifest.webmanifest`, `registerSW.js`.
- **Decided what "PWA generate" means** — the one judgement call in the round. Ruled it means
  *"vite-plugin-pwa runs and emits sw.js + manifest"* (✅ passes), **not** *"installable to a home
  screen"* (which would fail on `icons: []`). Five pieces of evidence, in
  `docs/autopilot/2026-08-22-pwa-generate-audit.md` §3.2. The decisive one is internal
  consistency: §8's **next** criterion says the diff must be *"เฉพาะ presentation + Tailwind config
  + src/ui"* — adding icon files to `public/` and editing `vite.config.ts` sits outside both
  categories, so reading this criterion as "installable" makes the spec contradict itself.
- **Added 11 tests** in `src/pwaGenerate.audit.test.ts` (new file, collides with nothing).
  Mocks `vite-plugin-pwa` and imports `vite.config.ts`, so it reads the options actually handed
  to `VitePWA()` — no build output needed, cannot pass vacuously.
- **Found and recorded two manifest drifts nobody had noticed** (details below), locked with
  `GAP:` tests that go red the day someone closes them.
- **Wrote `docs/autopilot/2026-08-22-pwa-generate-audit.md`** and updated `AUTOPILOT.md`
  (ticked the box with its evidence, handed off criterion 4, added 6 new traps to the trap list).

## Why

- **Why tick rather than leave open.** Two earlier rounds (`_0005`, `_0023`) audited this and
  declined to tick, both times over the empty icon list — but neither recorded a reason for
  treating "PWA generate" as "installable". `git log --follow -- vite.config.ts` returns only
  **two commits ever**, both from 2026-07-24, while the UI-overhaul merge is 2026-08-03. The
  overhaul never touched the file, so it regressed nothing. Leaving the box unticked forever over
  a pre-existing infra gap the spec never mentions (grep finds zero occurrences of
  icon/install/home-screen/offline/service-worker in the spec) was the wrong call.
- **Why "106 tests" is a floor, not an equality.** Spec line 7 states the intent: *"**คง**เทสต์ 106
  ตัวให้เขียว"* — keep the existing 106 green. Read as equality, the criterion would forbid ever
  writing another test, which contradicts the whole autopilot goal.
- **Why I did not fix the two drifts I found.** Both are 2–3 line edits to `vite.config.ts`. Doing
  them would pull a file outside *"presentation + Tailwind config + src/ui"* into this spec's diff
  — which is exactly what **the next criterion audits**. I'd have manufactured a violation for
  the next round to trip over. Handed off with full information instead.
- **Why the test reads config rather than `dist/`.** Verify is `npm test && npm run build`, so
  tests always run **before** the build; any `dist/` a test could read is from a previous build,
  and on a clean machine there is none. An `if (exists)` test would silently skip itself.

## Verification

Ran the Verify command myself. Both halves green:

```
$ npm test
 Test Files  40 passed (40)
      Tests  144 passed (144)

$ npm run build
> tsc -b && vite build
✓ 116 modules transformed.
✓ built in 1.13s
PWA v1.3.0 / mode generateSW / precache 5 entries (846.04 KiB)
files generated: dist/sw.js, dist/workbox-9c191d2f.js
```

**⚠️ The full Verify caught a failure `npm test` alone did not.** My first version of test E1 used
`await import('../tailwind.config.js')`. Tests were green at 144/144 — but `tsc -b` failed with
`TS7016: Could not find a declaration file for module '../tailwind.config.js'`. vitest transpiles
without typechecking; `tsc -b` typechecks test files too. Rewrote it to read the file with `fs`
and regex the token, then **re-ran the mutation check** (M9) to confirm the new version still has
teeth. Had I stopped at `npm test`, I would have committed a broken build.

**Mutation check — 13 breaks in 6 batches. Predicted the red set before each batch; all 6 matched.**

| Break | Predicted | Actual |
|---|---|---|
| M1 remove `VitePWA()` from `plugins` | A1 B2 C1 C2 D3 E1 | same (6 failed) |
| M2–M6 `injectManifest` / `prompt` / `injectRegister:false` / `short_name` / `fullscreen` | B1 B2 B3 C1 C2 | same (5 failed) |
| M7 `icons:[{src:'/pwa-192.png'}]` (no sizes/type) | D2 D3 | same (2 failed) |
| M10+M11 **close the gaps**: colour → `#0a0a0c`, add `lang:'th'` | E1 E2 | same (2 failed) |
| M12+M8 `index.html lang="en"` + stub validator | E2 D1 | same (2 failed) |
| M9 `phantom-bg` → `#1A1A1A` (after the E1 rewrite) | E1 | same (1 failed) |

**All 11 tests killed by at least one break.** Every mutation reverted with
`git checkout -- <file>`, `git status --short` verified clean before each commit. Tests were
committed **before** breaking anything (`git checkout -- src` deletes uncommitted files too).

Two results worth more than the tally:
- **M8 killed D1 only — D2 stayed green.** With `icons: []`, a validator stubbed to `() => []`
  passes D2 forever. That is the vacuity D1 exists to catch, demonstrated rather than asserted.
- **M1 did not kill B1/B3/D2/E2**, because all four are written `x ?? default` to tolerate
  unset config. That is deliberate, and it is exactly why the A1 spine test has to exist.

## What I did NOT do

- **Did not add PWA icons.** They must be real binary images; this headless box cannot author them
  meaningfully, and the asset + config change falls outside the next criterion's allowed diff.
- **Did not fix the two drifts I found** (reasoning above) — recorded and handed off instead.
- **Did not touch the "chunk > 500 kB" warning.** It is a warning, exit code is 0, and
  code-splitting is architecture work outside this spec (§9). Rounds 0020 and 0036 ruled the same.
- **Did not change any production code.** The only non-doc file added is a test.
- **Did not open a browser or run the service worker.** No installability or offline behaviour was
  observed — only inferred from the manifest contents.

## Risk

**Reviewer should look hardest at the decision to tick.** It rests on interpreting an
under-specified three-word phrase. My reasoning is in audit §3.2 and I believe the
internal-consistency argument (point 5) is decisive, but a reviewer who reads "PWA generate" as
"shipping an installable PWA" would reasonably untick it. If so, the fix is to untick — the tests
and the audit stay valid either way, because **they record the gap rather than paper over it**.

**Three gaps are open and deliberately unclosed** (all locked by `GAP:` tests, all in audit §3.3):

1. **G1 — `manifest.icons: []`.** The app genuinely **cannot be installed to a home screen**.
   The booth iPad can only run it as a Safari tab with a URL bar eating screen space. This is a
   real operational limitation regardless of how the criterion is read. Pre-dates the spec.
2. **G2 — splash colours are the pre-overhaul palette.** *New finding this round, and it is a
   drift the UI overhaul itself caused.* `theme_color`/`background_color` are `#1A1A1A`, which
   **was correct** when written — `git show 75659de:tailwind.config.js` shows `phantom-bg:
   '#1A1A1A'` at that time. Neon Clarity moved `phantom-bg` to `#0a0a0c` on 2026-08-03 and left
   the manifest behind. The splash screen is the one surface the overhaul missed; round 0051's
   "every page" sweep could not see it because the splash is not a page under `src/`.
   **This arguably weakens criterion 1** (already ticked on another branch) more than it affects
   this one.
3. **G3 — manifest declares no `lang`**, so vite-plugin-pwa defaults it to `en` while
   `index.html` says `lang="th"`. Two documents describing the same app disagree.

**Evidence scope, stated plainly:** the 11 tests prove **what the config declares**, not that
`dist/sw.js` is produced. That half rests on the build output quoted above — a point-in-time
observation no test can lock, same as the queue-pro tests/build criterion. **D1 is killed by
mutating the test's own helper, not by any production break**, because `malformedIcons()` lives in
the test file; it is a meta-test whose job is propping up D2, and I have not counted it as
production-killed. Nothing here was measured in a browser.

**Cross-branch note:** this branch was cut from `main`, so none of the earlier rounds' test files
exist here. `src/pwaGenerate.audit.test.ts` is named to avoid colliding with `src/pwaConfig.test.ts`
on branch `_0005`, which was never merged. The plan referred to that file as
`src/pwa.manifest.test.ts` — **that path does not exist**; I found the real one via
`git log --all --diff-filter=A`.
