import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test, expect } from 'vitest'
import { L, type LabelKey } from './labels'

// เกณฑ์ "Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ" มีแก่นอยู่ที่ระดับ *ข้อมูล*
// ไม่ใช่ CSS: ถ้า key ที่จอลูกค้าเรียกใช้มีแต่ `en` (หรือ `th` ที่เป็นภาษาอังกฤษปลอมๆ)
// ลูกค้าที่อ่านอังกฤษไม่ออกจะเจอจอที่ตัวเองอ่านไม่ได้ — นั่นคือบั๊กจริง ไม่ใช่เรื่องความสวยงาม

// `import.meta.url` ใต้ vitest ไม่ใช่ file:// เสมอไป จึงอ่านจาก root ของโปรเจคแทน
// (vitest ตั้ง cwd ไว้ที่ root อยู่แล้ว) — ถ้าไฟล์ย้าย readFileSync จะ throw ดังๆ ไม่ใช่ผ่านเงียบๆ
const DISPLAY_SRC = readFileSync(resolve(process.cwd(), 'src/screens/DisplayScreen.tsx'), 'utf8')

const THAI = /[฀-๿]/

/** ทุก call site แบบ static — `L('display.next')` / `L("booth.drinks")` */
function staticKeys(src: string): LabelKey[] {
  const found = [...src.matchAll(/\bL\(\s*(['"])([^'"]+)\1\s*\)/g)].map((m) => m[2] as LabelKey)
  return [...new Set(found)]
}

// `L(\`booth.${booth}\`)` เป็น template literal จึงอ่านจาก source ตรงๆ ไม่ได้ — ระบุครบทั้ง 3 ซุ้มไว้เอง
const BOOTH_KEYS: LabelKey[] = ['booth.photo', 'booth.portrait', 'booth.drinks']

test('the Display screen really does ask for labels by key (guards the scan below)', () => {
  // ถ้าวันหนึ่ง DisplayScreen เปลี่ยนไปใช้ <BiLabel k="..."/> แทน L('...') regex ข้างบนจะจับได้ 0 ตัว
  // แล้วเทสต์ถัดไปจะ "ผ่านแบบว่างเปล่า" — บรรทัดนี้คือกันไม่ให้ผ่านแบบนั้น
  expect(staticKeys(DISPLAY_SRC).length).toBeGreaterThanOrEqual(5)
})

test('every label key the Display screen uses has a real Thai string', () => {
  const missing = [...staticKeys(DISPLAY_SRC), ...BOOTH_KEYS].filter((k) => !THAI.test(L(k)?.th ?? ''))
  // ชื่อ key ที่ขาดถูกใส่ไว้ในข้อความ fail เอง คนอ่านผลเทสต์จะได้รู้ทันทีว่าต้องไปเติมที่ไหน
  expect(missing).toStrictEqual([])
})

test('the Thai side is not a copy of the English side', () => {
  const cloned = [...staticKeys(DISPLAY_SRC), ...BOOTH_KEYS].filter((k) => L(k).th === L(k).en)
  expect(cloned).toStrictEqual([])
})

test('L() has no silent fallback — an unknown key blows up instead of quietly showing English', () => {
  const unknown = L('display.doesNotExist' as LabelKey)
  expect(unknown).toBeUndefined()
  expect(() => (L('display.doesNotExist' as LabelKey)).th).toThrow(TypeError)
})
