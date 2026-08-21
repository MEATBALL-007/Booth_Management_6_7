# Audit — "tests เขียวครบ + `npm run build` ผ่าน + PWA generate"

**เกณฑ์:** `docs/superpowers/specs/2026-08-03-ui-overhaul-design.md` §8 บรรทัดที่ 88
**รอบ:** 2026-08-22 (0031) · branch `auto/Booth_Management_6_7/2026-08-22_0031` (แตกจาก `main` = `735de75`)
**ผล:** ✅ **ผ่านครบทั้งสามข้ออ้างย่อย — ติ๊กแล้ว** (เหตุผลของการติ๊กอยู่ที่ §3 อ่านก่อนเชื่อ)

---

## 0. TL;DR

| ข้ออ้างย่อย | ผล | หลักฐาน |
|---|---|---|
| tests เขียวครบ | ✅ | `133 passed (133)` / `39 passed (39)` ก่อนเริ่มงาน · `144 passed (144)` / `40` หลังเพิ่มไฟล์รอบนี้ |
| `npm run build` ผ่าน | ✅ | exit 0, `✓ built in 1.35s` (warning chunk >500 kB มีจริง — เป็น warning ไม่ใช่ error) |
| PWA generate | ✅ | `PWA v1.3.0 / mode generateSW / precache 5 entries` → `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest`, `dist/registerSW.js` |

**แต่** พบช่องว่างที่ยังไม่ปิด 3 อย่าง ซึ่ง**ไม่ทำให้เกณฑ์ข้อนี้ตก** (เหตุผล §3) และถูกล็อกด้วยเทสต์ `GAP:` แล้ว:
1. `manifest.icons` ว่าง → **ติดตั้งลงโฮมสกรีนไม่ได้**
2. splash colour ยังเป็น palette **ก่อน** Neon Clarity (`#1A1A1A` แทนที่จะเป็น `#0a0a0c`) ← **ของใหม่รอบนี้**
3. manifest ไม่ประกาศ `lang` → default เป็น `en` ขณะที่ `index.html` เป็น `lang="th"` ← **ของใหม่รอบนี้**

---

## 1. tests เขียวครบ

รันเองบน branch นี้ **ห้ามนับจากความจำ** (บทเรียนรอบ 0036: แผนบอก 148 แต่ของจริงคือ 133
เพราะ 148 นับรวมไฟล์เทสต์ของ branch ที่ไม่เคย merge)

```
$ npm test        # ก่อนเริ่มงานรอบนี้
 Test Files  39 passed (39)
      Tests  133 passed (133)
   Duration  23.17s
```

### ⚠️ เลข "106" ในเกณฑ์ไม่ใช่ค่าที่ต้องเท่ากัน

เกณฑ์เขียนว่า "**106** tests เขียวครบ" แต่บรรทัดที่ 7 ของ spec เดียวกันอธิบายเจตนาไว้ตรงตัวว่า

> ยกเครื่องหน้าตาทั้งระบบ … โดย **ไม่แตะ logic** และ **คงเทสต์ 106 ตัวให้เขียว**

คำว่า "**คง**…ให้เขียว" = 106 คือ **จำนวนเทสต์ที่มีอยู่ ณ วันเขียน spec** และเกณฑ์คือ
"ห้ามทำให้มันแดง" ไม่ใช่ "ห้ามมีเทสต์เกิน 106" — ตีความเป็น equality เมื่อไหร่
เกณฑ์จะกลายเป็นข้อห้ามเขียนเทสต์เพิ่ม ซึ่งขัดกับ Goal ของงาน autopilot ทั้งชุด
→ อ่านเป็น **floor** (≥106 และไม่มีตัวไหนแดง) ซึ่งวันนี้ผ่าน

---

## 2. `npm run build` ผ่าน

```
$ npm run build
> tsc -b && vite build
vite v8.1.5 building client environment for production...
✓ 116 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.20 kB
dist/index.html                   0.90 kB │ gzip:   0.50 kB
dist/assets/index-Bfaj-MoZ.css   13.51 kB │ gzip:   3.77 kB
dist/assets/index-CxgB-Y4T.js   851.78 kB │ gzip: 257.58 kB
✓ built in 1.35s
(!) Some chunks are larger than 500 kB after minification. …
```

`tsc -b` ผ่านด้วย (ถ้า type error จะหยุดก่อนถึง `vite build`)

**warning "chunk > 500 kB" มีจริงและจงใจไม่แก้** — เป็น warning ไม่ใช่ error, exit code ยังเป็น 0,
และการไป code-split คือการแตะ architecture ซึ่งอยู่นอกเกณฑ์นี้และนอก scope ของ spec (§9)
(รอบ 0020 และ 0036 ตัดสินเหมือนกัน — บันทึกไว้เพื่อไม่ให้รอบหลังมาไล่แก้ซ้ำ)

---

## 3. PWA generate — ข้อที่ต้องตัดสิน

### 3.1 สิ่งที่เกิดขึ้นจริงตอน build

```
PWA v1.3.0
mode      generateSW
precache  5 entries (846.04 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

และ `dist/index.html` ถูกแทรก
`<link rel="manifest" href="/manifest.webmanifest">` + `<script id="vite-plugin-pwa:register-sw" src="/registerSW.js">`

`dist/manifest.webmanifest` ที่ออกมา:

```json
{"name":"สายสัมพันธ์ ม.6/7","short_name":"Sai Samphan","start_url":"/","display":"standalone",
 "background_color":"#1A1A1A","theme_color":"#1A1A1A","lang":"en","scope":"/","icons":[]}
```

### 3.2 คำถาม: "PWA generate" หมายถึงอะไร

spec §8 เขียนลอยๆ ว่า "PWA generate" ไม่ขยายความเลย และ **ทั้งไฟล์ spec ไม่มีคำว่า
icon / install / home screen / offline / service worker อยู่เลยแม้แต่คำเดียว**
(grep ทั้งไฟล์ได้ 2 hit: บรรทัด 3 "booth PWA" กับบรรทัด 88 ตัวเกณฑ์เอง)

**สองการตีความที่เป็นไปได้:**

- **(ก) "vite-plugin-pwa รันแล้วออก sw.js + manifest"** → ผ่านแล้ว
- **(ข) "ติดตั้งเป็นแอปบนโฮมสกรีนได้จริง"** → ยังไม่ผ่าน (ต้องมี icon 192×192 + 512×512)

**ตัดสินว่า (ก) — ด้วยเหตุผล 5 ข้อที่ตรวจสอบได้ ไม่ใช่ความรู้สึก:**

1. **เจตนาของ spec ทั้งฉบับเป็น regression guard** — บรรทัดที่ 7 บอกว่างานนี้คือ
   "ไม่แตะ logic และคงเทสต์ให้เขียว" และเกณฑ์ข้อนี้มัด 3 อย่างไว้ด้วยกัน
   (tests + build + PWA) = **ชุดตรวจสุขภาพของ build pipeline** ว่าการยกเครื่อง UI ไม่ทำอะไรพัง
   ไม่ใช่รายการฟีเจอร์ที่ต้องสร้างใหม่

2. **`vite.config.ts` ไม่เคยถูกงาน overhaul แตะเลย** — `git log --follow -- vite.config.ts`
   คืนมา **2 commit เท่านั้น**: `dd38428` (scaffold) และ `75659de` (2026-07-24
   "route by device mode + PWA manifest") ส่วน UI overhaul merge ที่ `4c8a5d6` คือ **2026-08-03**
   → `icons: []` เก่ากว่าตัว spec สิบวัน overhaul ไม่ได้ทำให้อะไรแย่ลง

3. **สเปกไม่เคยเอ่ยถึง icon เลย** — ถ้าตั้งใจสั่งให้เพิ่ม asset ใหม่ 2 ไฟล์
   มันคือ deliverable ที่ต้องเขียนไว้ ไม่ใช่สิ่งที่ซ่อนอยู่ในคำว่า "generate"

4. **§9 Out of scope** ตัด "เพิ่มฟีเจอร์ใหม่" ออกไป และ §7 บอกว่าเปลี่ยนแค่ presentation

5. **⭐ ข้อชี้ขาด — เกณฑ์ข้อถัดไปในลิสต์เดียวกันห้ามไว้เอง**
   §8 ข้อที่ 4 เขียนว่า *"Firestore/logic ไม่มีการเปลี่ยนแปลง (**diff เฉพาะ presentation +
   Tailwind config + src/ui**)"* — การเพิ่มไฟล์ icon ลง `public/` แล้วแก้ `vite.config.ts`
   **อยู่นอกสามหมวดนั้นทั้งคู่** ถ้าอ่านเกณฑ์ข้อนี้เป็น (ข) spec จะขัดกันเอง:
   ข้อ 3 สั่งให้ทำสิ่งที่ข้อ 4 ห้าม → การอ่านที่ทำให้ spec สอดคล้องกันคือ (ก) เท่านั้น

### 3.3 ⚠️ ช่องว่างที่ยังเปิดอยู่ — บันทึกไว้ ไม่ได้ทิ้งเป็นสถานะ "ไม่รู้"

**เกณฑ์ผ่าน ≠ แอปติดตั้งได้** สองอย่างนี้ไม่ใช่เรื่องเดียวกัน และรอบนี้ **ไม่ปิดช่องว่างนี้**

| # | ช่องว่าง | ผลกับผู้ใช้จริง | ปิดยังไง | ทำไมรอบนี้ไม่ทำ |
|---|---|---|---|---|
| G1 | `manifest.icons: []` | iOS/Android ไม่ขึ้น "Add to Home Screen" → iPad ซุ้มเปิดได้แค่ใน Safari มีแถบ URL กินที่จอ | เพิ่ม `public/pwa-192.png` + `pwa-512.png` แล้วประกาศใน manifest | ต้องมี **ไฟล์ภาพไบนารีจริง** ซึ่งเครื่อง headless นี้สร้างเองตามใจไม่ได้ + แตะ `vite.config.ts` = ชนเกณฑ์ข้อ 4 |
| G2 | `theme_color`/`background_color` = `#1A1A1A` แต่ Neon Clarity ใช้ `#0a0a0c` | splash screen ของแอปที่ติดตั้งแล้ววาบสีเทาอ่อนกว่าตัวแอปหนึ่งจังหวะ | แก้สองบรรทัดใน `vite.config.ts` | เป็นของเกณฑ์ข้อ 1 (Neon Clarity สม่ำเสมอ) ไม่ใช่ข้อนี้ + แตะ `vite.config.ts` = ชนเกณฑ์ข้อ 4 ที่กำลังจะ audit รอบหน้าพอดี |
| G3 | manifest ไม่ประกาศ `lang` → plugin default `en` ขณะ `index.html` เป็น `lang="th"` | เอกสารสองใบที่บรรยายแอปเดียวกันขัดกัน; screen reader อ่านชื่อไทยด้วยเสียงอังกฤษ | เพิ่ม `lang: 'th'` ใน manifest | เหมือน G2 |

**G2 เป็นของใหม่ที่ไม่มีรอบไหนเคยบันทึก และมันเป็น drift ที่เกิดจากงานของ spec นี้เอง:**

```
$ git show 75659de:tailwind.config.js | grep phantom-bg
        'phantom-bg': '#1A1A1A',        ← ตอนเขียน manifest ค่านี้ตรงกันพอดี
$ grep phantom-bg tailwind.config.js
        'phantom-bg': '#0a0a0c',        ← Neon Clarity ย้ายไป แล้วลืม manifest ไว้ข้างหลัง
```

manifest **เคยถูกต้อง** ตอน 2026-07-24 แล้ว overhaul วันที่ 2026-08-03 ย้าย palette
โดยไม่ตามไปแก้ → **splash screen คือพื้นผิวเดียวที่ Neon Clarity ตกสำรวจ**
(รอบ 0051 กวาด "ทุกหน้า" ครบ 5 หน้า + chrome แต่ splash ไม่ใช่ "หน้า" ใน `src/` จึงไม่โดนกวาด)

---

## 4. เทสต์ที่เพิ่ม

`src/pwaGenerate.audit.test.ts` (ไฟล์ใหม่ — ไม่ชนกับใคร) **11 เทสต์**

> ชื่อไฟล์ตั้งใจไม่ซ้ำกับ `src/pwaConfig.test.ts` ของ branch `_0005` (commit `895e0a6`)
> ซึ่ง**ไม่เคย merge** และไม่ได้อยู่บน branch นี้ — ไฟล์นี้เขียนใหม่ให้จบในตัวเอง ไม่อ้างข้าม branch
> (แผนรอบนี้เรียกไฟล์นั้นว่า `src/pwa.manifest.test.ts` ซึ่ง**ชื่อผิด** ของจริงคือ `pwaConfig.test.ts`)

**วิธี assert:** mock `vite-plugin-pwa` ทิ้ง แล้ว `await import('../vite.config')`
→ อ่าน **option ที่ถูกส่งให้ `VitePWA()` จริงๆ** โดยไม่ต้อง build

- `vi.mock` factory ถูก hoist ขึ้นเหนือ `const` ทุกตัว → ต้องใช้ `vi.hoisted()` ไม่งั้นชน TDZ
- **ทำไมไม่อ่าน `dist/`**: Verify command คือ `npm test && npm run build` → เทสต์รัน **ก่อน** build เสมอ
  `dist/` ที่อ่านได้จึงเป็นของ build รอบก่อนซึ่งเชื่อไม่ได้ และบนเครื่องที่ยังไม่เคย build จะไม่มีเลย
  → เทสต์ที่ `if (exists) …` จะกลายเป็นเทสต์ที่ **ข้ามตัวเองเงียบๆ**
- ส่วน `tailwind.config.js` อ่านด้วย `fs` เป็น **ข้อความ** แล้ว regex เอาค่า `phantom-bg`
  (เหตุผลอยู่ที่ §4.3 — ไม่ใช่เรื่องสไตล์ แต่เป็นเรื่อง build พัง)

| กลุ่ม | เทสต์ | พิสูจน์อะไร |
|---|---|---|
| A | A1 | `VitePWA()` ถูกเรียกจริง + plugin อยู่ใน graph — **กันทั้งไฟล์ผ่านแบบว่างเปล่า** |
| B | B1 | `strategies` เป็น generateSW (คำว่า "generate" ในเกณฑ์) ไม่ใช่ `injectManifest` |
| B | B2 | `registerType: 'autoUpdate'` — จอซุ้มเปิดทิ้งไว้ทั้งวัน ไม่มีใครมากด reload |
| B | B3 | `injectRegister` ไม่ถูกปิด — ไม่งั้น sw.js ถูก generate แต่ไม่มีใครลงทะเบียน |
| C | C1, C2 | ชื่อแอป + `display: 'standalone'` |
| D | **D1** | **validator ของ icon มีฟันวันนี้จริง** (ยิงใส่ fixture ที่ผิด 3 แบบ) |
| D | D2 | icon ทุกตัวใน manifest well-formed (วันนี้ว่าง → มีฟันในวันที่มีคนเพิ่ม) |
| D | D3 | `GAP:` icons ว่าง = ติดตั้งไม่ได้ |
| E | E1 | `GAP:` splash colour ≠ `phantom-bg` ที่อ่านสดจาก `tailwind.config.js` |
| E | E2 | `GAP:` manifest ไม่มี `lang` แต่ `index.html` เป็น `th` |

### 4.1 ทำไมต้องมี D1

D2 คือเทสต์ที่ "ผ่านแบบไม่มีอะไรให้ตรวจ" วันนี้ เพราะ `icons` ว่าง
ถ้า validator ถูกเขียนผิดเป็น `() => []` **D2 ก็ยังเขียว** ตลอดกาล
D1 จึงยิง fixture ที่ผิดจริง 3 แบบ (ลืม `src` / ลืม `sizes` / ลืม `type`) เข้าไป
แล้วบังคับให้ validator ชี้ตัวผู้ร้ายออกมาครบ — **พิสูจน์ตอน mutation ว่ามันจำเป็น** (ดู M8 ใน §5)

### 4.3 ⚠️ `npm test` เขียว ไม่ได้แปลว่า `npm run build` ผ่าน (เจอจริงรอบนี้)

ฉบับแรกของ E1 เขียนว่า `await import('../tailwind.config.js')` เพื่ออ่าน palette
**`npm test` ผ่าน 144/144** แต่พอรัน Verify เต็ม:

```
$ npm run build
> tsc -b && vite build
src/pwaGenerate.audit.test.ts(52,32): error TS7016: Could not find a declaration file
for module '../tailwind.config.js'. … implicitly has an 'any' type.
```

**บทเรียนสองชั้น:**
1. **vitest ไม่ typecheck** มันแค่ transpile → ไฟล์เทสต์ที่ type ผิดยังรันเขียวได้สบาย
2. **`tsc -b` กินไฟล์เทสต์ด้วย** → เทสต์ที่เขียวสนิทสามารถทำให้ **build แดง** ได้

→ นี่คือเหตุผลตรงๆ ว่าทำไมกฎถึงบังคับให้รัน **Verify command เต็ม** เอง
ไม่ใช่แค่ `npm test` แล้วสรุปว่าเรียบร้อย รอบนี้ถ้าหยุดที่ `npm test` จะ commit ของพัง

**ทางแก้:** อ่าน `tailwind.config.js` ด้วย `fs` เป็นข้อความแล้ว regex
`/'phantom-bg':\s*'(#[0-9a-fA-F]{3,8})'/` — ไม่ต้องพึ่ง type declaration
และ `expect(neonBase).toBe('#0a0a0c')` ทำหน้าที่ยืนยันว่า regex แมตช์จริงไปในตัว
(ถ้าไม่แมตช์ → `undefined` → แดงตรงนั้น ไม่ไหลไปเงียบที่บรรทัดล่าง)

### 4.2 เทสต์ `GAP:` คืออะไร

D3 / E1 / E2 **ยืนยันว่าช่องว่างยังอยู่** ไม่ได้ยืนยันความถูกต้อง
→ วันที่มีคนมาปิดช่องว่าง เทสต์จะ**แดง** ซึ่งตั้งใจให้แดง เพื่อบังคับให้คนนั้น
เดินมาอัปเดตบัญชีตรงนี้ด้วย แทนที่จะปิดเงียบๆ แล้วเอกสารค้างอยู่ที่ความจริงเก่า
(รูปแบบเดียวกับ `GAP: a device on a stale snapshot still writes` ของรอบ 0042)

---

## 5. Mutation check — ทำนายก่อน แล้วเทียบผลจริง

**ทำนายชุดที่ควรแดงไว้ก่อนรันทุกชุด และตรงทุกชุด** (ถ้าไม่ตรง = เข้าใจเทสต์ตัวเองผิด)

| # | สิ่งที่ break | ทำนาย | ผลจริง | ตรง? |
|---|---|---|---|---|
| M1 | ถอด `VitePWA(...)` ออกจาก `plugins` ทั้งก้อน | A1 B2 C1 C2 D3 E1 | A1 B2 C1 C2 D3 E1 (6 failed) | ✅ |
| M2–M6 | `strategies:'injectManifest'` + `registerType:'prompt'` + `injectRegister:false` + `short_name:'Sai'` + `display:'fullscreen'` | B1 B2 B3 C1 C2 | B1 B2 B3 C1 C2 (5 failed) | ✅ |
| M7 | `icons: [{ src: '/pwa-192.png' }]` (ลืม sizes/type) | D2 D3 | D2 D3 (2 failed) | ✅ |
| M10+M11 | **ปิดช่องว่าง**: colour → `#0a0a0c` + เพิ่ม `lang:'th'` | E1 E2 | E1 E2 (2 failed) | ✅ |
| M12+M8 | `index.html` → `lang="en"` + stub validator เป็น `() => false` | E2 D1 | E2 D1 (2 failed) | ✅ |
| M9 | `tailwind.config.js` → `phantom-bg: '#1A1A1A'` (ย้อน palette) | E1 | E1 (1 failed) | ✅ |

> M9 รันซ้ำ **หลัง**เขียน E1 ใหม่เป็นแบบ `fs`+regex (§4.3) เพื่อยืนยันว่าการเปลี่ยนวิธีอ่าน
> ไม่ได้ทำให้เทสต์เสียฟัน — แก้วิธี assert แล้วต้อง mutation check ซ้ำเสมอ

**ครบทั้ง 11 เทสต์ ถูกฆ่าอย่างน้อย 1 แบบ**

| เทสต์ | ถูกฆ่าโดย |
|---|---|
| A1 | M1 |
| B1 | M2 |
| B2 | M1, M3 |
| B3 | M4 |
| C1 | M1, M5 |
| C2 | M1, M6 |
| D1 | M8 |
| D2 | M7 |
| D3 | M1, M7 |
| E1 | M1, M9, M10 |
| E2 | M11, M12 |

รวม **13 mutation ใน 6 ชุด** — ทำนายชุดที่ควรแดงไว้ก่อนรันทุกชุด **ตรงทุกชุด**
ทุก mutation revert ด้วย `git checkout -- <file>` แล้วยืนยัน `git status --short` สะอาด
(commit เทสต์ก่อนเริ่ม break — `git checkout -- src` ลบไฟล์ที่ยังไม่ commit ทิ้งด้วย)

### 5.1 สิ่งที่ mutation check เปิดเผย (สำคัญกว่าตัวเลข)

- **M8 ฆ่า D1 ตัวเดียว — D2 ยังเขียว** นี่คือหลักฐานตรงๆ ว่า D2 **vacuous จริง**ในสภาพวันนี้
  และ D1 คือสิ่งเดียวที่ยืนยันว่า validator ทำงาน ถ้าไม่มี D1 กลุ่ม D ทั้งกลุ่มจะเป็นของปลอม
- **M7 ทำให้ D2 แดง** = D2 มีฟันจริงในสถานการณ์ที่มันถูกเขียนมาดัก (มีคนเพิ่ม icon แล้วลืม `sizes`)
- **M10+M11 (= การปิดช่องว่าง) ทำให้ E1/E2 แดง** = สัญญาของเทสต์ `GAP:` ทำงานจริง
- **M1 ไม่ฆ่า B1/B3/D2/E2** เพราะทั้งสี่ตัวเขียนเป็น `x ?? default` / `?? []`
  ซึ่งกลืน `undefined` ได้ — **จงใจ** (ต้องยอมให้ config ไม่ประกาศค่า default ได้)
  ราคาที่จ่ายคือมันไม่ช่วยจับกรณี "plugin หายไปทั้งตัว" → **A1 คือตัวที่รับหน้าที่นั้นแทน**
  (นี่คือเหตุผลที่ A1 ต้องมี ไม่ใช่แค่ของประดับ)

### 5.2 ข้อจำกัดที่ต้องพูดออกมา

**D1 ถูกฆ่าด้วยการ mutate ตัวเทสต์เอง ไม่ใช่ production** — เพราะ `malformedIcons()` เป็น
helper ที่อยู่ในไฟล์เทสต์ ไม่มี production mutation ไหนแตะมันได้ตามนิยาม
บันทึกไว้ตรงๆ แทนที่จะแกล้งนับรวมเป็น "ฆ่าด้วย production break" — D1 เป็น **meta-test**
หน้าที่ของมันคือค้ำ D2 ไม่ใช่ตรวจ production

---

## 6. ขอบเขตของหลักฐาน (อ่านก่อนเชื่อ)

- เทสต์ทั้ง 11 ตัวพิสูจน์ **สิ่งที่ config ประกาศไว้** ไม่ได้พิสูจน์ว่า `dist/sw.js` ถูกสร้างจริง
  ส่วน "สร้างจริง" พิสูจน์ด้วย output ของ `npm run build` ใน §3.1 ซึ่งเป็นหลักฐาน
  **ณ เวลาที่รัน** ไม่มีเทสต์ล็อกได้ (เหมือนเกณฑ์ tests/build ของ queue-pro รอบ 0036)
- **ไม่มีการเปิดเบราว์เซอร์จริง** ไม่มีใครกด "Add to Home Screen" ทดสอบ
  ข้อสรุปเรื่อง installability มาจาก**ข้อกำหนดของ manifest spec** (ต้องมี icon ≥192 และ 512)
  เทียบกับ `icons: []` ที่อ่านได้ตรงๆ — เป็นการอนุมานที่แน่นแต่ไม่ใช่การวัด
- **service worker ไม่เคยถูกรันจริง** ไม่ได้ทดสอบว่า offline แล้วแอปยังเปิดได้
  (`precache 5 entries` บอกว่ามีอะไรถูก precache ไม่ได้บอกว่ามันทำงาน)
- เกณฑ์ข้อนี้เป็น "ณ เวลาที่ตรวจ" ผูกกับ `main = 735de75` + branch นี้เท่านั้น
  branch อื่นไม่เคย merge → "ทั้งชุดเขียว" พิสูจน์ได้ทีละ branch เสมอ

---

## 7. สิ่งที่ไม่ได้ทำ และเหตุผล

- **ไม่เพิ่มไฟล์ icon** — ต้องเป็นภาพไบนารีจริง เครื่อง headless สร้างตามใจไม่ได้
  และมันคือ asset ใหม่ซึ่งอยู่นอก "presentation + Tailwind config + src/ui" ของเกณฑ์ข้อ 4
- **ไม่แก้ G2/G3 ทั้งที่เป็นแค่ 2–3 บรรทัดใน `vite.config.ts`** — จงใจ เหตุผลหลักคือ
  **เกณฑ์ข้อถัดไปที่ต้อง audit คือ "diff เฉพาะ presentation + Tailwind config + src/ui"**
  การแก้ `vite.config.ts` รอบนี้จะเอาไฟล์นอกสามหมวดเข้าไปอยู่ใน diff ของ spec นี้ด้วยมือตัวเอง
  แล้วรอบหน้าจะต้องมานั่งอธิบายว่าทำไมถึงมีไฟล์นั้นอยู่ — สร้างปัญหาให้ตัวเอง
  → ส่งต่อพร้อมข้อมูลครบ ให้รอบที่ตัดสินเรื่องขอบเขต diff เป็นคนตัดสินใจ
- **ไม่ไล่แก้ warning chunk > 500 kB** — เป็น warning ไม่ใช่ error (§2)
