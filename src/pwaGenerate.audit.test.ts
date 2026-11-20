/**
 * Acceptance criterion — ui-overhaul, the third:
 *
 *   "106 tests เขียวครบ + `npm run build` ผ่าน + PWA generate"
 *
 * Like the queue-pro criterion that `frozenZones.audit.test.ts` closed, this one
 * is META. It splits into three pieces and only ONE of them has real work in it.
 *
 *   PIECE 1 — "tests เขียวครบ" and "`npm run build` ผ่าน" are the project's Verify
 *     command, verbatim. A test that asserts the tests pass is circular, so
 *     NOTHING here attempts it. The evidence is the recorded run in
 *     `docs/autopilot/2026-09-02-pwa-generate-audit.md`.
 *     (The spec's "106" is the count on the day the spec was written; it is 300
 *     now. Read as "no test is red", not "exactly 106 exist". The spec is the
 *     judge and must not be edited to match the code.)
 *
 *   PIECE 2 — "PWA generate" IS checkable, and is the whole content of this file.
 *     `npm run build` prints `mode generateSW / precache 5 entries / dist/sw.js`
 *     today — but nothing anywhere pins that it will keep happening. Remove the
 *     VitePWA plugin from `vite.config.ts` and `npm test` stays green, `npm run
 *     build` still exits 0, and the app ships with no service worker at all. The
 *     build is silent about its own absence. So the claim proved here is about
 *     the CONFIG, not the artifact:
 *
 *       P. the plugin is registered in `plugins: [...]`
 *       R. `registerType` is a real, non-empty strategy
 *       M. the manifest identity fields are present and non-empty
 *       G. the mode is `generateSW` (not `injectManifest`, which needs a
 *          hand-written sw file this repo does not have)
 *       V. the whole scan over the real file, as one list
 *       K. the checker itself, pinned against fixtures
 *       S. a spine — what the checker actually found in the real file
 *       I. the icons gap (below)
 *
 *   PIECE 3 — `dist/` is build output and is gitignored. A sweep that reads
 *     `dist/sw.js` is green on a machine that just built and red on a clean
 *     checkout. Nothing here touches it. Prove the config, not the artifact.
 *
 * ── 🚨 THE ICONS GAP — read before changing anything here ────────────────────
 * `manifest.icons` is `[]`, and `git ls-files` finds no .png/.ico/.svg anywhere
 * in the repo. The generated `dist/manifest.webmanifest` carries `"icons":[]`
 * straight through. A manifest with no icon CANNOT be installed to an iPad home
 * screen, which is the entire reason this app is a PWA — the booth iPads are
 * meant to run fullscreen with no browser chrome.
 *
 * This is recorded as a GAP, not fixed, and not hidden. The reasoning:
 *
 *   - The criterion's words are "PWA generate". Generation is what is proved:
 *     the plugin is wired, the mode is generateSW, and the build emits sw.js.
 *     Installability is an adjacent property the spec never states.
 *   - Fixing it means authoring booth artwork and creating a `public/` directory
 *     that does not exist. Inventing a school's icon in an unattended round is a
 *     design decision, not an audit.
 *   - I1/I2 below pin the gap so it cannot be quietly forgotten, and name where
 *     it lives. NO assertion was loosened to let `icons: []` through — `icons`
 *     was never in the violation list, because putting it there would turn the
 *     whole suite red and hold the branch back rather than prove anything.
 *
 * ⚠️ I1 is the same shape as E1 in the Idempotency audit: it asserts the CURRENT
 * BROKEN STATE. If I1 ever goes red, somebody added icons — that is the fix, not
 * a regression. Promote it into a real installability assertion and update
 * `docs/autopilot/2026-09-02-pwa-generate-audit.md`; do not delete it.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED: that `vite.config.ts` still declares a generateSW PWA build
 * with a non-empty manifest identity, read out of the real file on disk by a
 * brace-matching extractor that is itself pinned against fixtures.
 *
 * WHAT IS **NOT** PROVED:
 *   - **That a service worker is emitted.** This file never runs vite. The
 *     config could be perfect and the build still fail for an unrelated reason.
 *     `npm run build` is the authority for that, and its output is recorded in
 *     the note. Config and artifact are different layers.
 *   - **That the PWA works.** No browser installs it, no offline request is
 *     served, no `precache` entry is fetched. And it demonstrably does NOT fully
 *     work — see the icons gap above.
 *   - **Behaviour of the plugin.** `strategies` being absent is read as the
 *     documented vite-plugin-pwa default of `generateSW`. That is the plugin's
 *     documentation taken on trust, not something this file observes. The
 *     recorded build output is the corroborating evidence.
 *   - **`lang: "en"`.** The emitted manifest carries `"lang":"en"` — a plugin
 *     default, on an app whose UI is Thai-first. Noted in the audit note, not
 *     asserted here: it is not part of this criterion, and guessing at a fix
 *     would be scope creep.
 */
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { test, expect } from 'vitest'

// Vitest runs from the project root. `import.meta.url` is NOT a file: URL here,
// so `fileURLToPath` would throw and the whole file would report 0 tests.
const REPO = process.cwd()
const CONFIG_PATH = join(REPO, 'vite.config.ts')

/* ── the extractor ──────────────────────────────────────────────────────────
 * Deliberately NOT regexes. A regex over a config file is the blind-scanner
 * trap `frozenZones` M6/M7 demonstrated: it reports "clean" for a clean file
 * and for a file it never understood, identically. This walks delimiters and
 * skips string literals and line comments, so K0 can prove it on a hostile
 * fixture where a brace lives inside a string.
 */

const OPENERS: Record<string, string> = { '(': ')', '{': '}', '[': ']' }
const CLOSERS = new Set([')', '}', ']'])

/** Index of the closing quote matching the quote at `quoteIdx`. */
function skipString(src: string, quoteIdx: number): number {
  const quote = src[quoteIdx]
  for (let i = quoteIdx + 1; i < src.length; i++) {
    if (src[i] === '\\') {
      i++
      continue
    }
    if (src[i] === quote) return i
  }
  throw new Error(`unterminated string literal at ${quoteIdx}`)
}

/** The text BETWEEN the delimiter at `openIdx` and its match. */
function sliceBalanced(src: string, openIdx: number): string {
  const open = src[openIdx]
  const close = OPENERS[open]
  if (!close) throw new Error(`not an opening delimiter at ${openIdx}: ${open}`)
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(src, i)
      continue
    }
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? src.length : nl
      continue
    }
    if (OPENERS[ch]) depth++
    else if (CLOSERS.has(ch)) {
      depth--
      if (depth === 0) {
        if (ch !== close) throw new Error(`mismatched ${open} ... ${ch} at ${i}`)
        return src.slice(openIdx + 1, i)
      }
    }
  }
  throw new Error(`unbalanced ${open} at ${openIdx}`)
}

/** Split object/array body text on commas that are at nesting depth zero. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(text, i)
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i)
      i = nl === -1 ? text.length : nl
      continue
    }
    if (OPENERS[ch]) depth++
    else if (CLOSERS.has(ch)) depth--
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** Index of the first `:` at nesting depth zero, or -1. */
function topLevelColon(text: string): number {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(text, i)
      continue
    }
    if (OPENERS[ch]) depth++
    else if (CLOSERS.has(ch)) depth--
    else if (ch === ':' && depth === 0) return i
  }
  return -1
}

/** `{ a: 1, b: '2' }` body → `{ a: '1', b: "'2'" }` (values kept as raw text). */
function objectEntries(bodyText: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of splitTopLevel(bodyText)) {
    const colon = topLevelColon(part)
    const key = (colon === -1 ? part : part.slice(0, colon)).trim().replace(/^['"`]|['"`]$/g, '')
    out[key] = colon === -1 ? '' : part.slice(colon + 1).trim()
  }
  return out
}

/** The identifier a call expression calls: `VitePWA({...})` → `VitePWA`. */
function callName(expr: string): string {
  const m = /^([A-Za-z_$][\w$.]*)\s*\(/.exec(expr.trim())
  return m ? m[1] : expr.trim()
}

/** The contents of a string literal, or null if `raw` is not one. */
function stringValue(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2) return null
  const q = t[0]
  if ((q !== "'" && q !== '"' && q !== '`') || t[t.length - 1] !== q) return null
  return t.slice(1, -1)
}

/** Index of `name(`, searching for the call rather than any mention. */
function findCall(src: string, name: string): number {
  const re = new RegExp(`\\b${name}\\s*\\(`)
  const m = re.exec(src)
  return m ? m.index + m[0].length - 1 : -1
}

/* ── the scan ───────────────────────────────────────────────────────────── */

/** Manifest fields that carry the app's identity. Empty is as bad as missing. */
const REQUIRED_MANIFEST_FIELDS = [
  'name',
  'short_name',
  'theme_color',
  'background_color',
  'display',
] as const

/** Options that only mean anything under `strategies: 'injectManifest'`. */
const INJECT_MANIFEST_ONLY = ['srcDir', 'filename', 'injectManifest']

const ALLOWED_REGISTER_TYPES = ['autoUpdate', 'prompt']

type Scan = {
  plugins: string[]
  pwaOptions: Record<string, string>
  manifest: Record<string, string>
  violations: string[]
}

function scanViteConfig(source: string): Scan {
  const violations: string[] = []
  const empty: Scan = { plugins: [], pwaOptions: {}, manifest: {}, violations }

  const configIdx = findCall(source, 'defineConfig')
  if (configIdx === -1) {
    violations.push('no defineConfig(...) call found')
    return empty
  }
  const config = sliceBalanced(source, configIdx)

  const pluginsKey = config.indexOf('plugins:')
  if (pluginsKey === -1) {
    violations.push('no plugins: [...] in defineConfig')
    return empty
  }
  const plugins = splitTopLevel(
    sliceBalanced(config, config.indexOf('[', pluginsKey)),
  ).map(callName)

  if (!plugins.includes('VitePWA')) {
    violations.push(`VitePWA is not registered in plugins[]; found: ${plugins.join(', ')}`)
    return { plugins, pwaOptions: {}, manifest: {}, violations }
  }

  const pwaIdx = findCall(config, 'VitePWA')
  const pwaArg = sliceBalanced(config, pwaIdx).trim()
  if (!pwaArg.startsWith('{')) {
    violations.push('VitePWA(...) is not called with an options object')
    return { plugins, pwaOptions: {}, manifest: {}, violations }
  }
  const pwaOptions = objectEntries(sliceBalanced(pwaArg, 0))

  // R — registration strategy
  const registerType = stringValue(pwaOptions.registerType ?? '')
  if (!registerType) {
    violations.push('registerType is missing or is not a string literal')
  } else if (!ALLOWED_REGISTER_TYPES.includes(registerType)) {
    violations.push(`registerType is '${registerType}', not one of ${ALLOWED_REGISTER_TYPES.join('/')}`)
  }

  // G — the build mode
  const strategies = stringValue(pwaOptions.strategies ?? '')
  if (pwaOptions.strategies !== undefined && strategies !== 'generateSW') {
    violations.push(`strategies is ${pwaOptions.strategies}, not 'generateSW'`)
  }
  for (const key of INJECT_MANIFEST_ONLY) {
    if (pwaOptions[key] !== undefined) {
      violations.push(`${key} is an injectManifest-only option; this repo has no hand-written sw file`)
    }
  }

  // M — manifest identity
  const manifestRaw = pwaOptions.manifest
  if (manifestRaw === undefined || !manifestRaw.startsWith('{')) {
    violations.push('manifest is missing or is not an object literal')
    return { plugins, pwaOptions, manifest: {}, violations }
  }
  const manifest = objectEntries(sliceBalanced(manifestRaw, 0))
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    const value = stringValue(manifest[field] ?? '')
    if (value === null) violations.push(`manifest.${field} is missing or is not a string literal`)
    else if (value.trim() === '') violations.push(`manifest.${field} is an empty string`)
  }

  return { plugins, pwaOptions, manifest, violations }
}

/**
 * How many icons the manifest declares. Separate from the violation list on
 * purpose — see THE ICONS GAP above. K5 pins that this can return non-zero, so
 * I1's zero is a measurement and not a blind constant.
 */
function iconCount(source: string): number {
  const scan = scanViteConfig(source)
  const raw = scan.manifest.icons
  if (raw === undefined || !raw.startsWith('[')) return -1
  return splitTopLevel(sliceBalanced(raw, 0)).length
}

/* ── fixtures for the K group ───────────────────────────────────────────── */

const HEALTHY = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ทดสอบ',
        short_name: 'Test',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          { src: 'a.png', sizes: '192x192', type: 'image/png' },
          { src: 'b.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
`

// Written out in full rather than regex-stripped from HEALTHY: these files are
// CRLF, and a multi-line pattern written with `\n` silently matches nothing —
// which would leave this fixture identical to HEALTHY and K1 asserting nothing.
const NO_PWA = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
})
`

const EMPTY_NAME = HEALTHY.replace("name: 'ทดสอบ'", "name: ''")

const INJECT = HEALTHY.replace(
  "registerType: 'autoUpdate',",
  "registerType: 'autoUpdate',\n      strategies: 'injectManifest',\n      srcDir: 'src',\n      filename: 'sw.ts',",
)

/* ── the real file ──────────────────────────────────────────────────────── */

const source = readFileSync(CONFIG_PATH, 'utf8')
const real = scanViteConfig(source)

/* ═══ K — the checker itself, pinned against fixtures ═══════════════════════
 * Without this group a scanner that returned `[]` unconditionally would look
 * exactly like a scanner over a clean config. V1 alone proves nothing.
 */

test('K0: the extractor walks delimiters, and is not fooled by braces inside strings', () => {
  const hostile = `wrap({ a: { b: '}) not the end' }, c: [1, 2], d: "x:y" })`
  const body = sliceBalanced(hostile, hostile.indexOf('('))
  const entries = objectEntries(sliceBalanced(body, body.indexOf('{')))
  expect(Object.keys(entries)).toStrictEqual(['a', 'c', 'd'])
  expect(entries.a).toBe(`{ b: '}) not the end' }`)
  expect(entries.c).toBe('[1, 2]')
  expect(stringValue(entries.d)).toBe('x:y')
})

test('K1: removing VitePWA from plugins[] is reported, and names what was found', () => {
  const scan = scanViteConfig(NO_PWA)
  expect(scan.plugins).toStrictEqual(['react'])
  expect(scan.violations).toStrictEqual([
    'VitePWA is not registered in plugins[]; found: react',
  ])
})

test('K2: a healthy config produces ZERO violations — the checker can say clean', () => {
  const scan = scanViteConfig(HEALTHY)
  expect(scan.violations).toStrictEqual([])
  expect(scan.plugins).toStrictEqual(['react', 'VitePWA'])
})

test('K3: an empty manifest identity field is reported by name', () => {
  expect(scanViteConfig(EMPTY_NAME).violations).toStrictEqual([
    'manifest.name is an empty string',
  ])
})

test('K4: injectManifest mode and its options are reported', () => {
  expect(scanViteConfig(INJECT).violations).toStrictEqual([
    "strategies is 'injectManifest', not 'generateSW'",
    'srcDir is an injectManifest-only option; this repo has no hand-written sw file',
    'filename is an injectManifest-only option; this repo has no hand-written sw file',
  ])
})

test('K5: iconCount really counts — 2 on a populated fixture, 0 on an empty one', () => {
  expect(iconCount(HEALTHY)).toBe(2)
  expect(iconCount(HEALTHY.replace(/icons: \[[\s\S]*?\],/, 'icons: [],'))).toBe(0)
})

/* ═══ S — the spine: what the checker actually found in the real file ═══════
 * `expect(violations).toStrictEqual([])` is identical for a clean file and a
 * blind scanner. These pin what it saw, so blindness shows up here.
 */

test('S0: the real vite.config.ts was actually read off disk', () => {
  expect(existsSync(CONFIG_PATH)).toBe(true)
  expect(source.length).toBeGreaterThan(200)
  expect(source).toContain('defineConfig')
})

test('S1: the plugins array is exactly react() then VitePWA()', () => {
  expect(real.plugins).toStrictEqual(['react', 'VitePWA'])
})

test('S2: VitePWA is given exactly registerType and manifest', () => {
  expect(Object.keys(real.pwaOptions)).toStrictEqual(['registerType', 'manifest'])
})

test('S3: the manifest keys and values are exactly these', () => {
  expect(real.manifest).toStrictEqual({
    name: "'สายสัมพันธ์ ม.6/7'",
    short_name: "'Sai Samphan'",
    theme_color: "'#1A1A1A'",
    background_color: "'#1A1A1A'",
    display: "'standalone'",
    icons: '[]',
  })
})

/* ═══ P / R / M / G — the criterion itself ═════════════════════════════════ */

test('P1: the PWA plugin is registered, so the build still emits a service worker', () => {
  expect(real.plugins).toContain('VitePWA')
})

test('R1: registerType is autoUpdate — booth iPads must not sit on a stale bundle', () => {
  expect(stringValue(real.pwaOptions.registerType ?? '')).toBe('autoUpdate')
})

test('M1: every manifest identity field is present and non-empty', () => {
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    const value = stringValue(real.manifest[field] ?? '')
    expect(value, `manifest.${field}`).not.toBeNull()
    expect(value?.trim(), `manifest.${field}`).not.toBe('')
  }
})

test('G1: the mode is generateSW — no strategies override, no injectManifest options', () => {
  expect(real.pwaOptions.strategies).toBeUndefined()
  for (const key of INJECT_MANIFEST_ONLY) {
    expect(real.pwaOptions[key], key).toBeUndefined()
  }
})

test('V1: the whole scan over the real config reports no violations', () => {
  expect(real.violations).toStrictEqual([])
})

/* ═══ I — the documented gap ═══════════════════════════════════════════════ */

test('I1: GAP — the manifest declares icons and the array is EMPTY (not installable)', () => {
  // Red here means somebody added icons. That is the FIX, not a regression:
  // promote this into a real installability assertion and update the note at
  // docs/autopilot/2026-09-02-pwa-generate-audit.md. Do not delete it.
  expect(real.manifest.icons).toBe('[]')
  expect(iconCount(source)).toBe(0)
})

test('I2: GAP LOCATION — there is no icon asset anywhere in the repo to point at', () => {
  expect(existsSync(join(REPO, 'public'))).toBe(false)
  const tracked = execFileSync(
    'git',
    ['ls-files', '--', '*.png', '*.ico', '*.svg', '*.jpg', '*.jpeg', '*.webp'],
    { cwd: REPO, encoding: 'utf8' },
  )
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  expect(tracked).toStrictEqual([])
})
