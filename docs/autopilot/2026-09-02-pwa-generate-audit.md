# PWA generate — audit (2026-09-02, branch `auto/Booth_Management_6_7/2026-09-02_0007`)

Criterion, from `docs/superpowers/specs/2026-08-03-ui-overhaul-design.md` line 88:

> - [ ] 106 tests เขียวครบ + `npm run build` ผ่าน + PWA generate

Third criterion of the `ui-overhaul` group. `queue-pro-upgrade` is 8/8;
`ui-overhaul` was 2/5 (clamp · diff scope) before this round.

**No `src/` production file was changed this round.** `vite.config.ts` was not
changed either. The gap was missing evidence, plus one real defect that is
recorded rather than fixed — see §4.

---

## 1. The criterion splits into three, and only one has work in it

### Piece 1 — "tests เขียวครบ" + "`npm run build` ผ่าน"

This is the project's Verify command, verbatim. **A test that asserts the tests
pass is circular, so none was written** — the same call round `_0044` made for
the twin criterion in `queue-pro-upgrade`. The evidence is the recorded run:

```
$ npm test
 Test Files  51 passed (51)
      Tests  300 passed (300)
   Duration  31.06s

$ npm run build
> tsc -b && vite build
vite v8.1.5 building client environment for production...
✓ 116 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.20 kB
dist/index.html                   0.90 kB │ gzip:   0.50 kB
dist/assets/index-*.css          14.67 kB │ gzip:   3.97 kB
dist/assets/index-*.js          852.17 kB │ gzip: 257.66 kB
✓ built in 926ms

PWA v1.3.0
mode      generateSW
precache  5 entries (847.55 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**Interpretation of "106".** That is the test count on the day the spec was
written. It is 300 now. The criterion is read as *"no test is red"*, not
*"exactly 106 tests exist"*. The alternative — editing the spec to say 300 —
is forbidden outright: the spec is the judge, and a judge that gets edited to
match the defendant decides nothing.

`tsc -b` runs first in the build script, so the build is also the typecheck for
all 51 test files. `npm test` alone would not catch a type error in them.

### Piece 2 — "PWA generate" (the real work)

The build prints `mode generateSW` today, but **nothing pinned that it keeps
happening**. Delete the `VitePWA` plugin from `vite.config.ts` and:

- `npm test` stays green (nothing read the config)
- `npm run build` still exits 0
- and the app ships with **no service worker at all**

The build is silent about its own absence. So the claim proved is about the
**config**, not the artifact. 17 tests in `src/pwaGenerate.audit.test.ts`.

### Piece 3 — `dist/` is off limits

`dist/` is build output and gitignored. A sweep that reads `dist/sw.js` is green
on a machine that just built and red on a clean checkout. Nothing reads it.
Prove the config, not the artifact.

---

## 2. Why a brace-matching extractor and not regexes

Round `_0044` (M6/M7) proved that **a blind sweep and a clean sweep produce
identical output**: make the scanner return `[]` unconditionally and
`expect(violations).toStrictEqual([])` goes green in exactly the same way. A
regex over a config file is that trap by construction.

So the file parses `vite.config.ts` by walking delimiters — tracking nesting of
`()`/`{}`/`[]`, skipping string literals and `//` comments — and is pinned two
ways, as the standing rule requires:

- **K group (6 tests) — the checker against fixtures.** It must be able to say
  "clean" (K2, zero violations on a healthy config) *and* "broken" (K1, K3, K4),
  and `iconCount` must be able to return non-zero (K5), or I1's zero is a blind
  constant rather than a measurement. K0 feeds the extractor a hostile string
  containing `'}) not the end'` — a naive regex or a delimiter counter that does
  not skip strings gets it wrong.
- **S group (4 tests) — the spine.** What the checker actually found in the real
  file: the plugin list, the VitePWA option keys, and every manifest key *and
  value* verbatim. `violations === []` alone would be identical for a clean file
  and a blind scanner; S1–S3 are where blindness shows up.

`NO_PWA` is written out in full rather than regex-stripped from `HEALTHY`,
because these files are CRLF and a multi-line pattern written with `\n` matches
nothing — which would have left the fixture identical to `HEALTHY` and K1
asserting nothing at all. That exact mistake cost round `_0037` six mutations.

---

## 3. What the sweep asserts

| Group | Test | Claim |
|---|---|---|
| K | K0 | the extractor walks delimiters and is not fooled by braces inside a string |
| K | K1 | removing `VitePWA` from `plugins[]` is reported, naming what was found |
| K | K2 | a healthy config yields **zero** violations — it can say clean |
| K | K3 | an empty manifest identity field is reported by name |
| K | K4 | `injectManifest` mode and its options are reported |
| K | K5 | `iconCount` returns 2 on a populated fixture and 0 on an empty one |
| S | S0 | the real `vite.config.ts` was actually read off disk |
| S | S1 | `plugins` is exactly `react()` then `VitePWA()` |
| S | S2 | `VitePWA` is given exactly `registerType` and `manifest` |
| S | S3 | the manifest keys and values, verbatim (the canary) |
| P | P1 | the PWA plugin is registered |
| R | R1 | `registerType` is `autoUpdate` — booth iPads must not sit on a stale bundle |
| M | M1 | every manifest identity field is present and non-empty |
| G | G1 | mode is `generateSW` — no `strategies` override, no injectManifest-only options |
| V | V1 | the whole scan over the real config reports no violations |
| I | I1 | **GAP** — `manifest.icons` is declared and EMPTY |
| I | I2 | **GAP LOCATION** — no icon asset exists anywhere in the repo |

`strategies` being *absent* is read as vite-plugin-pwa's documented default of
`generateSW`. That is the plugin's documentation taken on trust; the recorded
build output (`mode generateSW`) is the corroborating evidence.

---

## 4. 🚨 The icons gap — recorded, not fixed, not hidden

```js
manifest: { name: 'สายสัมพันธ์ ม.6/7', short_name: 'Sai Samphan',
            theme_color: '#1A1A1A', background_color: '#1A1A1A',
            display: 'standalone', icons: [] }     // ← empty
```

and it reaches the output verbatim:

```json
{"name":"สายสัมพันธ์ ม.6/7","short_name":"Sai Samphan","start_url":"/",
 "display":"standalone","background_color":"#1A1A1A","theme_color":"#1A1A1A",
 "lang":"en","scope":"/","icons":[]}
```

`git ls-files -- '*.png' '*.ico' '*.svg' '*.jpg' '*.jpeg' '*.webp'` returns
**nothing**, and there is no `public/` directory. So there is not merely an empty
array — there is no artwork in the repository to put in it.

**A manifest with no icon cannot be installed to a home screen.** That is the
entire reason this app is a PWA: the booth iPads are meant to run fullscreen
with no browser chrome. `generateSW` still emits `sw.js`, so offline caching
works and nothing raises a sound — `npm run build` "passes" while the install
path is dead.

**The decision, and why.**

- The criterion's words are *"PWA generate"*. Generation is what is proved: the
  plugin is wired, the mode is `generateSW`, the build emits `sw.js` and a
  manifest. **Installability is an adjacent property the spec never states.**
- Fixing it means authoring booth artwork and creating a `public/` directory
  that does not exist. Inventing a school's icon in an unattended round is a
  design decision, not an audit — and it would also require editing
  `vite.config.ts` and `index.html` (apple-touch-icon), which is a second task.
- **No assertion was loosened.** `icons` was never placed in the violation list;
  putting it there would turn the suite red and hold the branch back rather than
  prove anything. I1 and I2 state the gap out loud and locate it.

⚠️ **I1 is the same shape as E1 in the Idempotency audit: it asserts the current
broken state.** If I1 goes red, somebody added icons — that is the *fix*, not a
regression. Promote it into a real installability assertion and update this
note. Do not delete it. M8 below is that future, run deliberately.

### A second, smaller finding — not asserted

The emitted manifest carries `"lang":"en"` (a vite-plugin-pwa default) on an app
whose entire UI is Thai-first, and whose `index.html` is `<html lang="th">`.
Recorded here and deliberately **not** asserted: it is not part of this
criterion, and guessing at a fix would be scope creep.

### A third observation — Tailwind scans the audit tests

`tailwind.config.js` has `content: ['./index.html', './src/**/*.{ts,tsx}']`,
which includes every `*.audit.test.ts` file. Adding this file moved the CSS
bundle from 14.64 kB to 14.67 kB — fixture strings emit dead utility classes
into production CSS. Harmless at this size; worth knowing before the Neon
Clarity round starts measuring the stylesheet.

---

## 5. Mutation check — 14 mutations

Predictions written and committed **before** any of them was run
(commit `PREDICT`, this section, below the line). `M1t` disambiguates the test
named `M1` from the mutation named `M1`. `census S2` is
`uiOverhaulDiffScope` S2; `fz C1` is `frozenZones` C1.

⚠️ **Every mutation that edits `vite.config.ts` also reddens `fz C1` and
`census S2`**, because the path classifies as `unknown` / `other` in those two
sweeps and is not declared. That is the tripwire working as designed — round
`_0037` wrote the warning in AUTOPILOT.md — not a flaw in this round. It is
listed once here rather than repeated in every row.

| # | Mutation | Predicted red (this file) |
|---|---|---|
| M1 | delete the `VitePWA(...)` entry from `plugins` | S1, S2, S3, P1, R1, M1t, V1, I1 |
| M2 | `registerType: 'autoUpdate'` → `'prompt'` | R1 |
| M3 | delete the `registerType` line | S2, R1, V1 |
| M4 | add `strategies: 'injectManifest'` | S2, G1, V1 |
| M5 | `name: 'สายสัมพันธ์ ม.6/7'` → `name: ''` | S3, M1t, V1 |
| M6 | delete the `short_name` line | S3, M1t, V1 |
| M7 | `theme_color: '#1A1A1A'` → `'#FA4616'` | S3 |
| M8 | `icons: []` → one real icon entry (**the fix**) | S3, I1 |
| M9 | `manifest: {…}` → `manifest: baseManifest` (hoisted const) | S3, M1t, V1, I1 |
| M10 | *checker*: `iconCount` always returns `0` | K5 |
| M11 | *checker*: `scanViteConfig` always returns `violations: []` | K1, K3, K4 |
| M12 | *checker*: `skipString` does not skip (returns `quoteIdx`) | K0 |
| M13 | *checker*: require `manifest.start_url` too (over-strict) | K2, K3, K4, M1t, V1 |
| M14 | create `public/pwa-192.png` | I2 |

M10–M13 mutate the checker rather than the config. They exist because a sweep
whose scanner is broken looks exactly like a sweep over clean code, and the only
tests that can tell the difference are the ones aimed at the scanner itself.

### Notable predictions and why

- **M1 does NOT kill G1.** With `VitePWA` gone, `strategies` and the
  injectManifest-only options are all `undefined` — which is exactly what G1
  asserts. G1 is a claim about *mode*, and a plugin that is absent has no mode.
  M4 is its only killer. Asking "what property does this destroy" rather than
  "what is it near" is the whole reason this was predicted rather than missed.
- **M2 does NOT kill V1.** `prompt` is a legal `registerType`, so the scanner
  raises no violation; only R1's exact-value claim fails. R1 and V1 are
  different altitudes on purpose.
- **M7 kills S3 and nothing else** — the pure canary demonstration. A valid
  colour change breaks no rule; it only moves a pinned value.
- **M8 is the gap closing.** It must kill I1, or I1 is a blind constant rather
  than a measurement of the config.
- **M11 does NOT kill K2 or V1.** Both assert an *empty* violation list, and a
  scanner that always returns empty satisfies them perfectly. This is the
  `_0044` M6/M7 result reproduced on a new scanner: K1/K3/K4 are the only
  things standing between V1 and vacuity.
- **M13 does NOT kill K1.** The scanner returns early on a missing plugin,
  before the manifest is ever inspected, so the extra requirement never runs.

### Results — **14 predicted, 14 correct**

Every row below is the observed red set from this file. `fz C1` and `census S2`
also fired on M1–M9 and M14 exactly as stated above, and on nothing else.

| # | Predicted | Observed | |
|---|---|---|---|
| M1 | S1, S2, S3, P1, R1, M1t, V1, I1 | S1, S2, S3, P1, R1, M1t, V1, I1 | ✅ |
| M2 | R1 | R1 | ✅ |
| M3 | S2, R1, V1 | S2, R1, V1 | ✅ |
| M4 | S2, G1, V1 | S2, G1, V1 | ✅ |
| M5 | S3, M1t, V1 | S3, M1t, V1 | ✅ |
| M6 | S3, M1t, V1 | S3, M1t, V1 | ✅ |
| M7 | S3 | S3 | ✅ |
| M8 | S3, I1 | S3, I1 | ✅ |
| M9 | S3, M1t, V1, I1 | S3, M1t, V1, I1 | ✅ |
| M10 | K5 | K5 | ✅ |
| M11 | K1, K3, K4 | K1, K3, K4 | ✅ |
| M12 | K0 | K0 | ✅ |
| M13 | K2, K3, K4, M1t, V1 | K2, K3, K4, M1t, V1 | ✅ |
| M14 | I2 | I2 | ✅ |

M1 was run against the **whole** suite (300 tests) rather than the three-file
subset, to catch anything unanticipated outside these files. Nothing else moved.
Only `src/pwaGenerate.audit.test.ts` reads `vite.config.ts` — the other two
reactions are to the *path* changing, via git, not to its contents.

### 🚨 M11 had to be run twice — the first attempt was not the declared mutation

The first M11 edit was `violations.push = () => 0`. It reported **K1, K2, K3, K4,
V1** — two more than predicted. The extra two were not a weakness in the
prediction; the edit was not the mutation it claimed to be:

> **`toStrictEqual` on an array also compares extra own properties.** Assigning
> to `violations.push` installs an own property on the array *instance*, so
> `expect(scan.violations).toStrictEqual([])` fails on `[]` — not because a
> violation was reported, but because the array object now carries a stray key.

So K2 and V1 died from the *assignment*, not from blindness. Re-run faithfully
as `return { ...scanViteConfigInner(source), violations: [] }`, the declared
mutation produced exactly K1, K3, K4. Recorded as 14/14 with this incident
written out, per AUTOPILOT rule (ช): *re-run so it matches what was declared,
before recording a prediction as missed*. Round `_0037` learned the same lesson
about a mutation that renamed a key while claiming to delete a declaration.

### The result that matters: M11

**A completely blind scanner leaves K2 and V1 green.** V1 —
`expect(real.violations).toStrictEqual([])`, the test that looks like the whole
point of the file — passes identically whether the config is clean or the
checker inspected nothing at all. K1, K3 and K4 are the only things standing
between V1 and vacuity. This is round `_0044`'s M6/M7 result reproduced on a
brand-new scanner, and it is why the K group exists.

M10 is the same hazard one level down: with `iconCount` hard-wired to `0`, **I1
stays green** — the gap-pinning test agrees the gap exists while measuring
nothing. K5 is its only killer.

### Coverage of the red sets

Every test in the file has a killer **except S0**, and the union of the red sets
covers all 17.

Tests with exactly **one** killer — 🚫 **do not delete these**:

| Test | Only killer | What is lost if it goes |
|---|---|---|
| K0 | M12 | the extractor could stop skipping strings and nothing would notice |
| K1 | M11 | the scanner could go blind; V1 and K2 would still be green |
| K2 | M13 | an over-strict rule could creep in; the sweep would cry wolf forever |
| K5 | M10 | `iconCount` could hard-wire `0` and I1 would agree with it |
| S1 | M1 | the plugin list would stop being pinned |
| P1 | M1 | the criterion's own headline claim |
| G1 | M4 | the mode could flip to `injectManifest` silently |
| I2 | M14 | the gap would stop being located |

**S0 has no killer, and that is intentional.** It asserts that
`vite.config.ts` was read off disk at all. The only mutation that could kill it
is deleting or renaming the config, which breaks `npm run build` outright — a
louder alarm than any test. S0 is not vacuous: if `CONFIG_PATH` were wrong,
`readFileSync` throws at module load and the file reports **0 tests while the
suite still says "passed"**, which is the `import.meta.url` trap this project
has already been bitten by. S0 makes that failure mode explicit and cheap to
read. Same posture as R1 in `uiOverhaulDiffScope`.

📌 **S3 is the canary.** M7 — changing `theme_color` to a different, perfectly
valid colour — kills S3 and nothing else. Any legitimate manifest edit will make
S3 red; the fix is to update the pinned values in S3, then let M1/G1/V1 re-prove
that the new values still satisfy the rules. **S3 pins *these values*; the rest
pin *properties*.**

---

## 6. ขอบเขตของหลักฐาน / Scope of the evidence

**What is proved.** That `vite.config.ts` still declares a `generateSW` PWA
build with a non-empty manifest identity, read out of the real file on disk by
an extractor that is itself pinned against fixtures both ways.

**What is NOT proved.**

- **That a service worker is emitted.** This file never runs vite. The config
  could be perfect and the build fail for an unrelated reason. `npm run build`
  is the authority for that, and its output is recorded in §1. Config and
  artifact are different layers, and only one of them is under test here.
- **That the PWA works.** No browser installs it, no offline request is served,
  no precache entry is fetched. And it demonstrably does **not** fully work —
  see §4. The install path is dead until someone adds an icon.
- **Plugin behaviour.** `strategies` being absent is read as the documented
  `generateSW` default. That is documentation taken on trust, not something
  observed here.
- **The 300-test / build-passes half.** Recorded from a real run, not asserted
  by any test, and deliberately so. A future reader must re-run the Verify
  command rather than trust this number; it was true at commit time only.
