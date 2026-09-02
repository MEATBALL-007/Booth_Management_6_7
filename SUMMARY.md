# Round summary — 2026-09-02, branch `auto/Booth_Management_6_7/2026-09-02_0007`

Task: close the `ui-overhaul` criterion
**"106 tests เขียวครบ + `npm run build` ผ่าน + PWA generate"**.

## What I did

- **Carried the ten already-proven criteria onto this branch.** The runner cut it
  from `main` again, so it started at 131 tests with 0 ticks. Verified
  `auto/…/2026-09-01_0037` is a strict superset (`git merge-base` returns `HEAD`,
  and the `--name-status` diff has no `D` rows) and checked it out by path.
  Result: 50 files, 283 tests green.
- **Wrote `src/pwaGenerate.audit.test.ts` — 17 tests.** It reads the real
  `vite.config.ts` with a brace-matching extractor (not regexes) and proves the
  PWA plugin is registered, `registerType` is `autoUpdate`, the manifest identity
  fields are non-empty, and the mode is `generateSW`. Six of the 17 are aimed at
  the checker itself and four are a spine of what it actually found.
- **Recorded the icons gap rather than papering over it.** `manifest.icons` is
  `[]`, no image asset exists anywhere in the repo, and the built
  `manifest.webmanifest` carries `"icons":[]` through — so the app cannot be
  installed to an iPad home screen. Pinned by two tests that name the gap and
  locate it. No assertion was loosened to let it pass.
- **Ran 14 mutations with the red sets predicted and committed beforehand.**
  14 of 14 matched.
- Ticked the criterion in `AUTOPILOT.md` (`ui-overhaul` is now 3/5, overall
  11/20), wrote `docs/autopilot/2026-09-02-pwa-generate-audit.md`, and rewrote
  the handoff.

**No `src/` production file was changed. `vite.config.ts` was not changed.**

## Why

- **The criterion splits in three and only one part has work in it.** "tests
  green" and "build passes" are the Verify command verbatim; a test asserting
  that the tests pass is circular, so none was written — the same call round
  `_0044` made for the twin criterion. The evidence is the recorded run.
  "PWA generate" is the part nothing had ever touched.
- **Config, not artifact.** `npm run build` prints `mode generateSW / precache 5
  entries / dist/sw.js` today, but nothing pinned that it keeps happening — M1
  confirmed that deleting the plugin leaves `npm test` green and the build
  exiting 0 with no service worker shipped. `dist/` is gitignored, so a sweep
  reading `dist/sw.js` would be green on a machine that just built and red on a
  clean checkout. The config is the only durable thing to assert.
- **"106" was read as "no test is red", not "exactly 106 exist".** It is 300 now.
  Editing the spec to match the code is forbidden outright, and is the one thing
  that would make this whole exercise worthless.
- **The icons gap is a real defect but not this criterion's.** The criterion's
  words are "PWA generate", and generation is fully proved. Installability is
  adjacent and unstated. Fixing it means authoring school artwork and creating a
  `public/` directory that does not exist — a design decision, not an audit, and
  a second task. So it is recorded loudly (I1/I2) in the same shape as the E1
  two-device gap from the Idempotency round.
- **A brace-matching extractor, not regexes**, because `_0044` proved a blind
  sweep and a clean sweep produce byte-identical output. M11 reproduced that on
  this new scanner — see Risk.

## Verification

Verify command, run after every mutation was reverted and `git status --short`
came back empty:

```
$ npm test
 Test Files  51 passed (51)
      Tests  300 passed (300)
   Duration  30.19s

$ npm run build
> tsc -b && vite build
✓ 116 modules transformed.
✓ built in 926ms
PWA v1.3.0
mode      generateSW
precache  5 entries (847.55 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**Mutation check — 14 predicted, 14 correct.** Predictions were committed in
`0e1725a` *before* the first mutation ran, so the table cannot have been written
backwards. Full results in `docs/autopilot/2026-09-02-pwa-generate-audit.md` §5.
M1 was run against the whole 300-test suite to catch anything unanticipated
outside the three files involved; nothing else moved.

Every test has a killer except S0, which is deliberate and explained.

## What I did NOT do

- **Did not fix `icons: []`.** Reasoning above. It is committed as a documented,
  located gap, not as a passing test.
- **Did not assert the `"lang":"en"` in the emitted manifest**, on an app whose
  UI is entirely Thai. Recorded in the note as an observation; it is not part of
  this criterion and guessing at a fix would be scope creep.
- **Did not write any test asserting that the tests pass or the build succeeds.**
  Deliberate, and stated in the test file's own header so a future reader does
  not "fix" the omission.
- **Did not touch `dist/`, the spec files, `firestore.rules`, or any accounting /
  menu / comms logic.** Did not add a dependency.
- Did not start the next criterion (Neon Clarity), though I did sweep the source
  for glow usage while writing the handoff and left the findings there.

## Risk — read these closely

1. **🚨 V1 is vacuous without the K group, and this was measured, not assumed.**
   M11 made the scanner report nothing at all, and `V1`
   (`expect(violations).toStrictEqual([])` — the test that looks like the point
   of the file) **stayed green**, as did K2. Only K1/K3/K4 caught it. The same
   hazard one level down: with `iconCount` hard-wired to `0`, **I1 stays green**
   and K5 is its only killer. If a future round deletes the "redundant-looking"
   fixture tests, the sweep keeps passing while proving nothing.
2. **🚨 M11 had to be run twice, and the first run was my error.** I declared
   "make the scanner blind" but wrote `violations.push = () => 0`, which installs
   an **own property on the array** — and `toStrictEqual` compares those, so K2
   and V1 died from the assignment rather than from blindness. Re-run faithfully
   it produced exactly the predicted K1/K3/K4. Scored 14/14 on the faithful runs;
   a reviewer who thinks the botched run should count against the prediction rate
   would score it 13/14. Both numbers are in the note.
3. **The config is proved; the service worker is not.** No test runs vite. If the
   config were perfect and the build broke for an unrelated reason, only
   `npm run build` would say so. `strategies` being *absent* is read as
   vite-plugin-pwa's documented `generateSW` default — documentation taken on
   trust, corroborated only by the recorded build output.
4. **The PWA demonstrably does not fully work.** With no icon it cannot be
   installed, which is the whole reason this app is a PWA. I ticked the criterion
   as written; a reviewer who reads "PWA generate" as including installability
   should untick it and treat I1 as the failing test it would then be.
5. **S3 is a canary and will go red on any legitimate manifest edit** (M7 —
   changing `theme_color` to a different valid colour — kills S3 and nothing
   else). The fix is to update the pinned values in S3, not to relax it.
6. **Every mutation touching `vite.config.ts` also reddened `frozenZones` C1 and
   `uiOverhaulDiffScope` S2**, because the path is undeclared in both. Expected
   and warned about by round `_0037`. I did not add it to either list, since I
   did not change the file — the next round that does must add it *with a reason*
   rather than loosen the classifiers.
7. **Audit test files are inside Tailwind's content glob**
   (`./src/**/*.{ts,tsx}`), so fixture strings emit dead utility classes into the
   production CSS. Adding this file moved the bundle 14.64 → 14.67 kB. Harmless
   now, but the Neon Clarity round will be measuring the stylesheet.
