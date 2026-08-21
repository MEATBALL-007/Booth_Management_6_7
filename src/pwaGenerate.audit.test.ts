import { readFileSync } from 'node:fs'
import { expect, test, vi } from 'vitest'

// เกณฑ์ที่ไฟล์นี้ตรวจ: `2026-08-03-ui-overhaul-design.md` §8
//   "106 tests เขียวครบ + `npm run build` ผ่าน + PWA generate"
//
// สองข้อแรกเป็นผลของการ "รันคำสั่ง" ล็อกด้วยเทสต์ไม่ได้ (ดู docs/autopilot/2026-08-22-pwa-generate-audit.md)
// ข้อที่สาม "PWA generate" ล็อกได้ และนี่คือสิ่งที่ไฟล์นี้ทำ
//
// ⚠️ **ขอบเขตของหลักฐาน (อ่านก่อนเชื่อ)**
// เทสต์ชุดนี้อ่าน **option ที่ถูกส่งให้ `VitePWA()` จริงๆ** โดย mock ตัว plugin ทิ้ง
// มันจึงพิสูจน์ว่า *config สั่งอะไรไว้* — **ไม่ได้** พิสูจน์ว่า `dist/sw.js` ถูกสร้างจริง
// (เทสต์ที่ไปอ่าน `dist/` จะไร้ค่าบนเครื่องที่ยังไม่ build และ `npm test` รัน **ก่อน** `npm run build`
//  ใน Verify command เสมอ → dist ที่อ่านได้จะเป็นของ build รอบก่อนซึ่งเชื่อไม่ได้)
// ส่วน "สร้างจริง" พิสูจน์ด้วยการรัน `npm run build` แล้วดู `PWA v1.3.0 / mode generateSW`
//
// ยังมีเทสต์ `GAP:` อยู่ท้ายไฟล์ ซึ่ง **ยืนยันช่องว่างที่ยังไม่ปิด** ไม่ใช่ยืนยันความถูกต้อง
// ถ้าใครมาปิดช่องว่างนั้น เทสต์จะแดง — ตั้งใจให้แดง เพื่อบังคับให้มาอัปเดตบัญชีตรงนี้ด้วย

type IconEntry = { src?: string; sizes?: string; type?: string; purpose?: string }
type ManifestOptions = {
  name?: string
  short_name?: string
  theme_color?: string
  background_color?: string
  display?: string
  lang?: string
  icons?: IconEntry[]
}
type PwaOptions = {
  registerType?: string
  strategies?: string
  injectRegister?: string | false | null
  manifest?: ManifestOptions | false
}

// `vi.mock` ถูก hoist ขึ้นบนสุดของไฟล์ ตัวแปรธรรมดาจึงยังไม่ถูกสร้างตอน factory ทำงาน → ต้อง `vi.hoisted`
const spy = vi.hoisted(() => ({ calls: [] as unknown[] }))

vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: PwaOptions) => {
    spy.calls.push(options)
    return [{ name: 'vite-plugin-pwa' }]
  },
}))

const config = (await import('../vite.config')).default
const options = spy.calls[0] as PwaOptions | undefined
const manifest = (options?.manifest || undefined) as ManifestOptions | undefined

// อ่าน palette จาก tailwind.config จริงๆ ไม่ hardcode → ถ้าใครขยับ token อีก เทสต์ E1 ยังเทียบถูก
const tailwind = (await import('../tailwind.config.js')) as unknown as {
  default: { theme: { extend: { colors: Record<string, string> } } }
}
const neonBase = tailwind.default.theme.extend.colors['phantom-bg']

// ───────────────────────────── A. กันเทสต์ทั้งไฟล์ผ่านแบบว่างเปล่า ─────────────────────────────

test('A1: vite.config really calls VitePWA and keeps the plugin in the graph', () => {
  // ถ้าใครถอด `VitePWA()` ออกจาก `vite.config.ts` เทสต์ข้างล่างทั้งหมดจะอ่าน `undefined?.field`
  // แล้วผ่านแบบไม่มีอะไรให้ตรวจได้ทั้งชุด — สองบรรทัดนี้คือสิ่งเดียวที่กันไม่ให้เกิดแบบนั้น
  expect(spy.calls).toHaveLength(1)

  const plugins = ((config.plugins ?? []) as unknown[]).flat(2) as Array<{ name?: string } | null>
  expect(plugins.map((p) => p?.name).filter(Boolean)).toContain('vite-plugin-pwa')
})

// ───────────────────────── B. คำว่า "generate" ในเกณฑ์ = generateSW ─────────────────────────

test('B1: the service worker is GENERATED, not hand-written — ตรงกับคำว่า "PWA generate"', () => {
  // `strategies: 'injectManifest'` = สลับไปโหมดที่ต้องมีไฟล์ sw ของเราเองใน `src/`
  // ซึ่งโปรเจคนี้ไม่มี → build จะพัง และคำว่า "generate" ในเกณฑ์จะไม่เป็นจริงอีกต่อไป
  // ปล่อยให้ไม่ประกาศได้ (default = generateSW) แต่ห้ามเป็นอย่างอื่น
  expect(options?.strategies ?? 'generateSW').toBe('generateSW')
})

test('B2: the service worker updates itself — คนหน้าซุ้มไม่ต้องมากด reload กลางงาน', () => {
  // ซุ้มเปิดจอ Display ทิ้งไว้ทั้งวัน ถ้า registerType เป็น 'prompt' จอจะค้างอยู่ที่โค้ดเวอร์ชันเก่า
  // จนกว่าจะมีคนเดินไปกดยืนยันที่จอ — ซึ่งกลางงานจริงไม่มีใครทำ
  expect(options?.registerType).toBe('autoUpdate')
})

test('B3: the register script is still injected — ไม่งั้น sw.js ถูกสร้างแต่ไม่มีใครลงทะเบียน', () => {
  // build รอบนี้พ่น `dist/registerSW.js` ออกมาและ `dist/index.html` มี
  // `<script id="vite-plugin-pwa:register-sw" src="/registerSW.js">` — ทั้งคู่มาจาก injectRegister
  // ถ้าตั้งเป็น `false` โดยไม่ไปเรียก registerSW เอง: sw.js ยังถูก generate แต่ไม่มีผลกับผู้ใช้เลย
  expect(options?.injectRegister ?? 'auto').not.toBe(false)
})

// ───────────────────── C. หน้าตาของแอปตอนถูกติดตั้ง (ค่าที่ manifest ประกาศ) ─────────────────────

test('C1: the installed app announces itself in Thai, ตรงกับชื่อที่ขึ้นบนจอซุ้ม', () => {
  expect({ name: manifest?.name, short_name: manifest?.short_name }).toStrictEqual({
    name: 'สายสัมพันธ์ ม.6/7',
    short_name: 'Sai Samphan',
  })
})

test('C2: the app opens standalone, ไม่ใช่แท็บเบราว์เซอร์ที่มีแถบ URL กินที่จอ', () => {
  // `display: 'standalone'` คือสิ่งเดียวที่ทำให้ไอคอนบนโฮมสกรีนเปิดแบบเต็มจอ
  // จอ Display ของซุ้มมีพื้นที่จำกัด แถบ URL กินที่ที่ควรเป็นเลขคิว
  expect(manifest?.display).toBe('standalone')
})

// ───────────────────────────── D. ไอคอน: ช่องว่างหลักของเกณฑ์นี้ ─────────────────────────────

/** คืน **ลิสต์ของ entry ที่ไม่ครบ** (ไม่ใช่ boolean) เพื่อให้ตอนแดงมันบอกได้เองว่าตัวไหนพัง */
function malformedIcons(icons: IconEntry[]): IconEntry[] {
  return icons.filter((i) => !i.src || !i.sizes || !i.type)
}

test('D1: the icon validator has teeth TODAY — ไม่ใช่ฟังก์ชันที่คืน [] เสมอ', () => {
  // ⚠️ นี่คือหัวใจของกลุ่มนี้ ตอนนี้ `manifest.icons` ว่าง เทสต์ D2 จึงผ่านแบบไม่มีอะไรให้ตรวจ
  // ถ้าไม่มีบรรทัดนี้ D2 จะเป็นเทสต์ปลอมที่ **ผ่านตลอดกาล** แม้ validator จะถูกเขียนผิดเป็น `() => []`
  // (บทเรียนรอบ 0006: decoy ที่ไม่เคยแมตช์ = ไม่ได้ assert อะไรเลย)
  const bad: IconEntry[] = [
    { sizes: '192x192', type: 'image/png' }, // ลืม src
    { src: '/pwa-192.png', type: 'image/png' }, // ลืม sizes → OS ไม่รู้ว่าใช้ขนาดไหน
    { src: '/pwa-512.png', sizes: '512x512' }, // ลืม type
  ]
  const good: IconEntry = { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }

  expect(malformedIcons([...bad, good])).toStrictEqual(bad)
  expect(malformedIcons([good])).toStrictEqual([])
})

test('D2: every icon the manifest declares is well-formed enough to install', () => {
  // วันนี้ว่างจึงผ่าน — เทสต์นี้ตั้งใจให้ "มีฟัน" ในวันที่ไอคอนถูกเพิ่มเข้ามา
  // (เพิ่ม `{ src: '/pwa-192.png' }` โดยลืม `sizes` = iOS/Android มองไม่เห็นว่าใช้ขนาดไหน → แดงทันที)
  expect(malformedIcons(manifest?.icons ?? [])).toStrictEqual([])
})

test('D3: GAP: the manifest declares zero icons, so the app is NOT installable', () => {
  // ⚠️ เทสต์นี้ยืนยัน **ช่องว่าง** ไม่ใช่ความถูกต้อง — ล็อกไว้เพื่อไม่ให้สถานะนี้หายไปเงียบๆ
  //
  // ที่มา: `vite.config.ts` ถูกเขียนครั้งเดียวที่ commit 75659de (2026-07-24) แล้วไม่เคยถูกแตะอีกเลย
  // งาน UI overhaul (merge 4c8a5d6, 2026-08-03) **ไม่ได้แตะไฟล์นี้** → ช่องว่างนี้เก่ากว่าตัว spec
  //
  // ผลจริง: `npm run build` พ่น sw.js + manifest.webmanifest ออกมาครบ (= "PWA generate" ผ่าน)
  //         แต่ iOS/Android ต้องเห็น icon อย่างน้อย 192×192 และ 512×512 ถึงจะขึ้น
  //         "Add to Home Screen" → วันนี้ยังติดตั้งลงโฮมสกรีน iPad ไม่ได้
  //
  // จะปิดช่องว่างนี้ต้องมี **ไฟล์ภาพจริง** ใน `public/` ซึ่งเป็นไบนารีที่ agent สร้างเองไม่ได้
  // เมื่อวันนั้นมาถึง: เทสต์นี้จะแดง → ให้ลบเทสต์นี้ทิ้ง แล้วปล่อยให้ D2 ทำหน้าที่แทน
  expect(manifest?.icons).toStrictEqual([])
})

// ─────────────────── E. drift ที่เจอระหว่างทาง (บันทึกไว้ ไม่ใช่ทิ้งเป็น "ไม่รู้") ───────────────────

test('E1: GAP: the splash colours are the PRE-overhaul palette, not Neon Clarity', () => {
  // เจอในรอบ 2026-08-22: `theme_color`/`background_color` ยังเป็น `#1A1A1A`
  // ซึ่ง **เคยถูกต้อง** — ตอน 75659de เขียน manifest นั้น `phantom-bg` ก็คือ `#1A1A1A` พอดี
  // แต่ Neon Clarity ย้าย `phantom-bg` ไปเป็น `#0a0a0c` (2026-08-03) **แล้วลืม manifest ไว้ข้างหลัง**
  // → splash screen ตอนเปิดแอปที่ติดตั้งแล้วจะวาบเทาอ่อนกว่าตัวแอปจริงหนึ่งจังหวะ
  expect(neonBase).toBe('#0a0a0c')
  expect({
    theme_color: manifest?.theme_color,
    background_color: manifest?.background_color,
  }).toStrictEqual({ theme_color: '#1A1A1A', background_color: '#1A1A1A' })

  // ยืนยันตรงๆ ว่านี่คือ drift ไม่ใช่ความบังเอิญที่อ่านผิด
  expect(manifest?.background_color?.toLowerCase()).not.toBe(neonBase.toLowerCase())
})

test('E2: GAP: the manifest declares no lang, so it defaults to en while index.html says th', () => {
  // `dist/manifest.webmanifest` ของ build รอบนี้มี `"lang":"en"` ทั้งที่ชื่อแอปเป็นภาษาไทยล้วน
  // ค่านั้นไม่ได้มาจาก `vite.config.ts` (ไม่มีใครเขียนไว้) แต่เป็น default ของ vite-plugin-pwa
  // ขณะที่ `index.html` ประกาศ `lang="th"` → เอกสารสองใบที่บรรยายแอปเดียวกันขัดกันเอง
  expect(manifest?.lang).toBeUndefined()

  const html = readFileSync('index.html', 'utf8')
  expect(html).toMatch(/<html[^>]*\blang="th"/)
})
