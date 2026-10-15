import { expect, test, vi } from 'vitest'

// เกณฑ์ "PWA generate" ของ `2026-08-03-ui-overhaul-design.md` ไม่ได้แปลว่าแค่ `dist/sw.js` ถูกสร้าง
// แต่แปลว่า **ติดตั้งลงโฮมสกรีน iPad แล้วใช้งานได้จริง** ซึ่งขึ้นกับ `manifest` ที่ประกาศไว้ใน
// `vite.config.ts` ล้วนๆ — ถ้า field หายไปสักตัว build ก็ยัง "ผ่าน" เงียบๆ เหมือนเดิม
// เทสต์ชุดนี้จึงอ่าน option ที่ถูกส่งให้ `VitePWA()` *จริงๆ* แทนที่จะรัน build แล้วไปอ่าน `dist/`
// (เทสต์ที่ต้องมี `dist/` ก่อนถึงจะมีความหมาย จะกลายเป็นเทสต์ที่ข้ามตัวเองเงียบๆ บนเครื่องที่ยังไม่ build)

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
type PwaOptions = { registerType?: string; manifest?: ManifestOptions }

// `vi.mock` ถูก hoist ขึ้นบนสุดของไฟล์ ตัวแปรธรรมดาจึงยังไม่ถูกสร้างตอน factory ทำงาน — ต้องใช้ `vi.hoisted`
const spy = vi.hoisted(() => ({ calls: [] as unknown[] }))

vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: PwaOptions) => {
    spy.calls.push(options)
    return [{ name: 'vite-plugin-pwa' }]
  },
}))

const config = (await import('../vite.config')).default
const options = spy.calls[0] as PwaOptions | undefined
const manifest = options?.manifest

test('vite.config really does hand a manifest to vite-plugin-pwa (guards every check below)', () => {
  // ถ้าวันหนึ่งมีคนถอด `VitePWA()` ออกจาก `vite.config.ts` เทสต์ที่เหลือจะอ่าน `undefined?.field`
  // แล้ว "ผ่านแบบว่างเปล่า" ได้ทั้งชุด — บรรทัดนี้คือกันไม่ให้ผ่านแบบนั้น
  expect(spy.calls).toHaveLength(1)

  const plugins = ((config.plugins ?? []) as unknown[]).flat(2) as Array<{ name?: string } | null>
  expect(plugins.map((p) => p?.name).filter(Boolean)).toContain('vite-plugin-pwa')
})

test('the service worker updates itself — คนหน้าซุ้มไม่ต้องมากด reload กลางงาน', () => {
  // ซุ้มเปิดจอทิ้งไว้ทั้งวัน ถ้า registerType เป็น 'prompt' จอจะค้างที่โค้ดเวอร์ชันเก่าจนกว่าจะมีคนกดยืนยัน
  expect(options?.registerType).toBe('autoUpdate')
})

test('the installed app announces itself in Thai, ตรงกับชื่อที่ขึ้นบนจอซุ้ม', () => {
  expect({ name: manifest?.name, short_name: manifest?.short_name }).toStrictEqual({
    name: 'สายสัมพันธ์ ม.6/7',
    short_name: 'Sai Samphan',
  })
})

test('the app opens standalone in the booth dark theme, ไม่ใช่แท็บเบราว์เซอร์ธรรมดา', () => {
  // `display: 'standalone'` คือสิ่งเดียวที่ทำให้ไอคอนบนโฮมสกรีนเปิดแบบเต็มจอไม่มีแถบ URL
  // ส่วน theme/background color คือสีที่ขึ้นตอน splash — ต้องเป็นสีเดียวกับ Neon Clarity base
  expect({
    display: manifest?.display,
    theme_color: manifest?.theme_color,
    background_color: manifest?.background_color,
  }).toStrictEqual({
    display: 'standalone',
    theme_color: '#1A1A1A',
    background_color: '#1A1A1A',
  })
})

test('the manifest still declares an icons list at all', () => {
  // ตอนนี้ list นี้ว่าง (ดู SUMMARY/AUTOPILOT: นั่นคือช่องว่างที่ยังไม่ได้ปิด) แต่ตัว field ต้องมีอยู่
  // ถ้ามีคนลบ key นี้ทิ้ง manifest จะเปลี่ยนรูปเงียบๆ และเทสต์ well-formed ข้างล่างจะกลายเป็นของว่าง
  expect(Array.isArray(manifest?.icons)).toBe(true)
})

test('every icon the manifest declares is well-formed enough to install', () => {
  // ตอนนี้ยังว่างจึงผ่านแบบไม่มีอะไรให้ตรวจ — เทสต์นี้ตั้งใจให้ "มีฟัน" ตอนที่ไอคอนถูกเพิ่มเข้ามา
  // (เพิ่ม `{ src: '/pwa-192.png' }` โดยลืม `sizes` = iOS/Android มองไม่เห็นว่าใช้ขนาดไหน → แดงทันที)
  const malformed = (manifest?.icons ?? []).filter((i) => !i.src || !i.sizes || !i.type)
  expect(malformed).toStrictEqual([])
})
