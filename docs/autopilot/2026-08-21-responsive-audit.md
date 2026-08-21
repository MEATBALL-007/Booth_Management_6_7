# Responsive audit — `2026-08-03-ui-overhaul-design.md`, criterion 2

> อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ — ไม่มี horizontal scroll, touch target ≥44px

**รอบ:** `auto/Booth_Management_6_7/2026-08-22_0006` · ฐาน `main = 735de75`
**ผล:** ผ่าน — **เจอบั๊กจริง 2 จุด แก้แล้วทั้งคู่** · เทสต์ 26 ตัวที่ `src/responsive.audit.test.tsx`
**เกณฑ์อ้างอิง:** spec §4 (Responsive rules) + §8 ข้อ 2

---

## 0. ขอบเขตของหลักฐาน — อ่านก่อนเชื่อผลสีเขียว

jsdom **ไม่รัน CSS cascade และไม่ layout เลย** ไม่มี viewport ไม่มี `scrollWidth`
ไม่มีการประเมิน media query → **"ไม่มี horizontal scroll" พิสูจน์ในไฟล์นี้ไม่ได้**
และไม่มีเทสต์ตัวไหนแกล้งทำเป็นพิสูจน์ได้

สิ่งที่พิสูจน์ได้จริงคือ **เงื่อนไขเชิงโครงสร้างที่ถ้าละเมิดแล้วจอจะล้นแน่ๆ**
บวกกับ touch target ซึ่งเป็น **ค่าที่ประกาศไว้** (declared length) ไม่ใช่ค่าที่วัดได้:

| กลุ่ม | สิ่งที่พิสูจน์ | สิ่งที่ **ไม่ได้** พิสูจน์ |
|---|---|---|
| A | ทุก interactive element ประกาศพื้น ≥44px | ปุ่มสูง 44px จริงบนจอจริง (ต้องรัน cascade) |
| B | ไม่มี fixed width เกินจอเล็กสุดโดยไม่มี guard · ทุก `<img>` มี `max-width:100%` | ว่าไม่มีอะไรล้นจริง (ต้องวัด `scrollWidth`) |
| C | ทุก grid เริ่มที่ 1–2 คอลัมน์ แล้วค่อยกว้างหลัง breakpoint | ว่า iPad ตั้งได้คอลัมน์เดียวจริง (ต้องประเมิน media query) |
| D | เลขจอใหญ่ใช้ `clamp()` ที่มี term กลางเป็นหน่วย viewport | ขนาดจริงเป็นพิกเซลบนจอ 55" |
| E | `index.html` มี viewport meta | — (ข้อนี้เป็น binary จาก source ตรงๆ) |

**ช่องว่างที่ยังเหลือ (ตั้งใจไม่ปิดรอบนี้):** ปิดข้อนี้ระดับพิกเซลต้องใช้เบราว์เซอร์จริง
เปิดที่ 360 / 768 / 1024 / 1920 px แล้ววัด `document.documentElement.scrollWidth`
เทียบ `clientWidth` ทุกหน้า + วัด `getBoundingClientRect().height` ของทุกปุ่ม
เครื่องนี้มี Playwright/chrome-devtools MCP อยู่ แต่ต้องยกเว้น network + ต้อง build/serve
ซึ่งเกินขอบเขต "หนึ่งงานต่อรอบ" — **บันทึกไว้เป็นงานถัดไปที่ทำได้จริง ไม่ใช่สถานะ "ไม่รู้"**

---

## 1. บั๊กที่เจอ (แก้แล้วทั้งสอง)

### บั๊ก 1 — พื้น 44px อยู่ที่ call site ไม่ได้อยู่ที่ primitive → มีคนลืมจริง

`src/ui/Button.tsx:18` (ก่อนแก้) มีแค่ `rounded-xl px-5 py-3 font-kanit font-bold …`
**ไม่มี `min-h` เลย** → ทุก caller ต้องพิมพ์ `className="min-h-[44px] …"` เอง
มี 15 call site ทั่วโปรเจค **14 อันจำได้ 1 อันลืม**:

```
src/screens/SetupScreen.tsx:107   <Button variant="primary" onClick={confirm} disabled={!valid}
                                          className="w-full text-lg">   ← ไม่มี min-h
```

นี่คือ **ปุ่มยืนยันบนหน้า Setup** = ปุ่มแรกที่ทุกเครื่องเห็นตอนตั้งค่าซุ้ม

**ทำไม grep มองไม่เห็น**: การกวาดหา `<button` ในไฟล์ source **มองข้ามอันนี้สนิท**
เพราะสิ่งที่เขียนอยู่คือ `<Button …>` (B ใหญ่ = component) ไม่ใช่ `<button`
→ กฎ "ทุก raw tag ต้องมี min-h" เขียวได้ทั้งที่ปุ่มจริงเตี้ย

**คำนวณ**: `py-3` = 0.75rem × 2 ที่ root 120% (19.2px/rem) = 28.8px
+ line-height ของ `text-lg` (1.75rem = 33.6px) ≈ 62px → **บังเอิญเกิน 44px อยู่แล้ว**
แต่ `<Button className="px-4 py-2 text-sm">` ที่ `CommsToast.tsx:40` = 19.2 + 24 ≈ 43px
**ต่ำกว่าพื้นทันทีถ้าเจ้าของ call site นั้นเผลอลบ `min-h-[44px]` ออก**
พื้นที่ประกาศตรงๆ ที่ primitive กันได้ทั้งสองกรณี ส่วนที่ "บังเอิญพอดี" ไม่ใช่หลักฐาน

**แก้ที่** `src/ui/Button.tsx` — ย้าย `min-h-[44px]` เข้าไปเป็น base class ของ primitive
`className` ของ caller ยัง**ต่อท้าย**เหมือนเดิม → caller ที่อยากใส่ padding/ความกว้างยังทำได้
(เทสต์ `A2c` ล็อกไว้ว่า caller override padding ได้ แต่ลดพื้นไม่ได้)

**ไม่ลบ `min-h-[44px]` ออกจาก 14 call site ที่มีอยู่** — ซ้ำซ้อนแต่ไม่เป็นพิษ
(Tailwind class เดียวกันซ้ำ = ไม่มีผล) และมันบันทึกเจตนาไว้ตรงจุด
การไล่ลบเป็น churn 14 จุดที่ไม่ได้ทำให้เกณฑ์ดีขึ้น

### บั๊ก 2 — QR ของ PromptPay เป็นภาพกว้างตายตัวไม่มีเพดาน

`src/order/QrCode.tsx:16` (ก่อนแก้):

```tsx
<img src={src} alt="PromptPay QR" width={240} height={240} className="rounded-lg bg-white p-2" />
```

spec §4 เขียนไว้ตรงตัวว่า **"รูป/การ์ด `max-width:100%`"** → รูปนี้ผิดเกณฑ์ตามตัวอักษร

**คำนวณจอแคบ**: กล่องนี้อยู่ใน `Panel` (`p-5` = 24px) ใน `OrderStation` (`p-4` = 19.2px)
ที่ root 120% → พื้นที่เหลือบนจอ 360px = 360 − 38.4 − 48 = **273.6px**
ตัวรูป 240 + `p-2` (9.6×2) = **259.2px** → พอดีเหลือ 14px
บนจอ 320px (iPhone SE) = 233.6px < 259.2 → **ล้นแน่นอน**
และ 360px ก็จะล้นทันทีถ้าใครเพิ่ม padding อีกนิดเดียว

**แก้โดยเติม `max-w-full h-auto`** — `h-auto` สำคัญพอๆ กัน: `max-w-full` เดี่ยวๆ
บนภาพที่มี `height={240}` ตายตัวจะ**บีบ QR ให้แบน** และ **QR ที่ยืดผิดสัดส่วนสแกนไม่ติด**
(เทสต์ `B2b` ล็อกทั้งคู่)

---

## 2. สิ่งที่ตรวจแล้วถูกอยู่ (ไม่ต้องแก้)

| ข้ออ้างย่อยของ spec §4 | สถานะ | หลักฐานในโค้ด |
|---|---|---|
| mobile `<640` = คอลัมน์เดียว | ✅ | grid ทุกอันมี base `grid-cols-1`/`grid-cols-2` (เทสต์ C1/C2) |
| iPad ตั้ง (768) = คอลัมน์เดียว | ✅ | `OrderStation:98` `grid-cols-1 lg:grid-cols-[1fr_380px]` — `lg:`=1024 ไม่ติดที่ 768 |
| iPad นอน (1024) = 2 คอลัมน์ | ✅ | `lg:` = `min-width:1024px` ติดพอดีที่ 1024 (เทสต์ C3) |
| HQ = grid หลายคอลัมน์ | ✅ | `DashboardScreen:66` `md:grid-cols-4`, `:77` `md:grid-cols-2` (เทสต์ C4) |
| จอใหญ่ = เลขคิว `clamp()` | ✅ | `QueueNumber.tsx:3` `clamp(96px,22vw,320px)` (เทสต์ D1) |
| relative units | ✅ | `index.css:5` root 120% + utility เป็น rem ทั้งหมด; ไม่มี `text-[Npx]` นอก clamp (D3/D4) |
| ไม่มี `overflow-x` | ✅ | กวาดทั้ง `src/` ไม่เจอ `overflow-x-*` และไม่เจอ `w-screen` (เทสต์ B4) |
| viewport meta | ✅ | `index.html:5` `width=device-width, initial-scale=1.0` (เทสต์ E1) |

**`index.html` viewport meta คือข้อที่สำคัญที่สุดในตาราง** ถ้าไม่มี มือถือจะ layout
ที่ ~980px แล้วย่อลง → **ทุกหน้าเลื่อนแนวนอนหมด ไม่ว่า CSS จะถูกแค่ไหน**
มันมีอยู่แล้ว แต่ก่อนรอบนี้ **ไม่มีเทสต์ตัวไหนล็อกไว้เลย** — ใครลบทิ้งก็ไม่มีอะไรร้อง

### จุดที่ recon รอบ 0051 สงสัยไว้ — ตรวจแล้วไม่ใช่ปัญหา

- **`OrderStation:98` `lg:grid-cols-[1fr_380px]`** — track ตายตัว 380px แต่**อยู่หลัง `lg:`**
  จอที่เห็น track นี้กว้าง ≥1024px อยู่แล้ว → 380 + 1fr พอ ✅ (เทสต์ B3 ล็อกกฎนี้ไว้)
- **`PinGate:34` `tracking-[0.3em]`** — letter-spacing ทำให้ข้อความยาวขึ้น แต่ `<input>`
  เลื่อนภายในตัวเอง **ไม่ดันหน้า** และ element มี `w-full` (box-sizing: border-box จาก
  Tailwind preflight) → ไม่ล้น ✅
- **`OrderStation:152` `w-16` / `:144` `w-8`** — 4rem/2rem ที่ root 120% = 76.8/38.4px
  อยู่ในแถว flex ที่ชื่อสินค้าเป็น `flex-1` → หดได้ ✅
- **`DisplayScreen` `text-[clamp(96px,22vw,320px)]` บนจอ 360px** — 22vw = 79.2px
  → clamp คืน **ค่า min 96px** (ไม่ใช่ 320px อย่างที่ recon กังวล)
  queue number คือ `${station}${n}` (`queueNumber.ts:6`) = `A1`…`C99` = **2–3 ตัวอักษร**
  mono ~0.6em → 3 × 57.6 = 173px < 283px (360 − p-8 สองข้าง) ✅
  เทสต์ D1 ผูกการคำนวณนี้ไว้: ถ้าใครดัน min ขึ้นไปเกินที่จอเล็กรับได้ เทสต์แดง

### deviation ที่รับรู้แล้วตัดสินว่าไม่ผิดเกณฑ์

- **`OrderStation:99` `grid-cols-2 sm:grid-cols-3`** — การ์ดสินค้าเป็น **2 คอลัมน์บนมือถือ**
  ขณะที่ spec §4 เขียนว่า mobile = "1 คอลัมน์" ตัดสินว่า **ไม่ผิด**: ประโยคนั้นพูดถึง
  **คอลัมน์หลักของ layout** (เมนู vs ตะกร้า) ซึ่ง `:98` ทำถูกแล้ว ส่วน grid ของ tile สินค้า
  2 ช่องบนจอ 360px = ช่องละ ~130px ซึ่งกว้างพอและ**ไม่ทำให้ล้น**
  บังคับเป็น 1 คอลัมน์จะทำให้ต้องเลื่อนยาวมากตอนรับออเดอร์ = แย่ลงในทางใช้งานจริง
  → เทสต์ C1 ตั้งเพดานที่ **2 คอลัมน์** (ไม่ใช่ 1) และให้ ≥3 ต้องอยู่หลัง breakpoint
- **`max-w-sm` / `max-w-md` / `max-w-lg` / `max-w-xl`** (5 จุด) — ที่ root 120%
  `max-w-sm` = 24rem = **460.8px** ไม่ใช่ 384px ตามเอกสาร Tailwind
  ⚠️ **บทเรียน: อย่าอ้างค่าพิกเซลของ Tailwind ตรงๆ ในโปรเจคนี้ ทุกค่าคูณ 1.2**
  แต่ทั้ง 5 จุดเป็น **เพดาน** ไม่ใช่พื้น: element เป็น block/flex ในสายปกติ จึงหดตามพ่อได้
  และ 3 ใน 5 จุด (`App:42`, `PinGate:22`, `OrderStation:195`) มี `w-full` คู่ไว้ด้วย ✅
  → `FIXED_WIDTH` ใช้ negative lookbehind กัน `max-w-[…]` ไม่ให้ถูกนับเป็นความกว้างตายตัว

---

## 3. เทสต์ 26 ตัว และผลการ break

`src/responsive.audit.test.tsx` (ไฟล์ใหม่ — branch อื่นเป็นเจ้าของไฟล์เทสต์เดิม)

break **22 แบบ** แบ่งเป็น 5 ชุด — **ทุกเทสต์ทั้ง 26 ตัวถูกฆ่าอย่างน้อย 1 แบบ**
ทำนายชุดที่ควรแดงไว้ล่วงหน้าทุกชุด แล้วผลออกมาตรงทุกชุด:

| ชุด | break | เทสต์ที่แดง (7+8+7+3+1 = 26) |
|---|---|---|
| A | ถอด `min-h` จาก Button · จาก PinGate input · ถอด `min-w` จาก ± · จาก ChoiceChip | A1 A2 A2b A2c A3 A4 A5 |
| B | ถอด `max-w-full h-auto` จาก QR · เติม `w-[900px]` · ถอด base `grid-cols-1` · เติม `overflow-x-auto` · ถอด `max-w-[90vw]` · เติม `grid-cols-[240px_1fr]` ไม่มี prefix | B1 B2 B2b B3 B4 B5 C2 C3 |
| C | `grid-cols-2 md:grid-cols-4` → `grid-cols-3` · clamp → `text-[200px]` · root 120%→100% · ถอด `md:p-12` · ขยาย clamp ของ next-up | C1 C4 D1 D2 D3 D4 D5 |
| D | ลบ viewport meta · ถอด `min-h-screen` · (ทำให้ `SOURCE_FILES` ว่าง) | test-0 E1 E2 |
| E | ถอด negative lookbehind ออกจาก `FIXED_WIDTH` | B1b |

(ชุด D ตัวที่ทำให้ `SOURCE_FILES` ว่าง และชุด E เป็นการ mutate **โค้ดของเทสต์เอง** —
บันทึกไว้ตรงๆ เพราะทั้งสองตัวเป็น meta-test ที่หน้าที่คือเฝ้าตัวกวาด ไม่ได้เฝ้า production)

---

## 4. กับดักที่เจอในรอบนี้ (สำหรับรอบถัดไป)

1. **ตัดข้อความก่อน assert = false positive** — ฉบับแรกเก็บ opening tag แล้ว `.slice(0,160)`
   ทันที **แล้วเช็คกฎบนสตริงที่ตัดแล้ว** → `<input>` 4 ตัวที่ className อยู่เลยตัวที่ 160
   ขึ้นเป็น "ละเมิด" ทั้งที่ถูกต้อง **ให้แยกค่าที่ assert ออกจากค่าที่พิมพ์เสมอ**
2. **JSX opening tag ข้ามหลายบรรทัด** — กวาดทีละบรรทัดจะรายงานทุก `<button` ในไฟล์นี้ว่าไม่มี
   `min-h` ต้องเก็บทั้ง tag โดยนับ brace depth (prop handler มี `>` อยู่ข้างใน: `() => …`)
3. **`git checkout -- src` ตอน mutation check ลบงานที่ยังไม่ commit ด้วย** — รอบนี้เผลอ
   revert การแก้เทสต์ B1b ที่ยังไม่ได้ commit ทิ้งไปโดยไม่รู้ตัว **และ `git status --short`
   ก็ขึ้น clean** (เพราะมันสะอาดจริง — สะอาดเพราะทิ้งงานไป ไม่ใช่เพราะถอน mutation อย่างเดียว)
   → **commit ให้เรียบร้อยก่อนเริ่ม break เสมอ** "status clean" ไม่ใช่ตัวยืนยันที่พอ
4. **decoy ที่ไม่ได้ทดสอบอะไรเลย** — เทสต์ B1b ฉบับแรกใช้ `shadow-[0_0_40px_rgba(...)]`
   เป็นตัวล่อของ `w-\[(\d+)px\]` แต่ `w-[0_0_40px…` **ไม่แมตช์อยู่แล้ว** (ต้องเป็น `[` ตามด้วย
   ตัวเลขแล้ว `px]` ทันที) → ถอด lookbehind ออกเทสต์ก็ยังเขียว = **เทสต์ไม่มีค่า**
   ตัวล่อที่ถูกต้องคือ `max-w-[900px]` ซึ่งลงท้ายด้วย `w-[900px]` เป๊ะ
   **บทเรียน: ตัวล่อของ mutation test ต้องพิสูจน์ด้วยว่ามันฆ่าได้จริง ไม่ใช่แค่ดูน่ากลัว**
5. **Tailwind ที่ root 120% ไม่ตรงกับเอกสาร** — `max-w-sm` = 460.8px ไม่ใช่ 384px
   การคำนวณความกว้างทุกครั้งในโปรเจคนี้ต้องคูณ 1.2

---

## 5. ผลการรัน (รอบนี้ บน branch นี้)

```
npm test    → Test Files 40 passed (40) · Tests 159 passed (159) · exit 0
npm run build → exit 0 · built in 1.76s
              PWA v1.3.0 · mode generateSW · precache 5 entries (846.93 KiB)
              (!) warning "chunk > 500 kB" — มีจริง เป็น warning ไม่ใช่ error ตั้งใจไม่แก้
```

⚠️ 159 = 133 (ของ main ตามที่รอบ 0036 รันไว้) + 26 ตัวใหม่ของรอบนี้ · 40 = 39 + 1 ไฟล์
**ห้ามเชื่อจำนวนเทสต์ข้าม branch — รันเองทุกครั้ง**

## 6. ไฟล์ที่แตะ

```
src/ui/Button.tsx               +min-h-[44px] ใน base class + comment  (presentation)
src/order/QrCode.tsx            +max-w-full h-auto                     (presentation)
src/responsive.audit.test.tsx   ไฟล์ใหม่ 26 เทสต์                        (test)
```

**ไม่มีไฟล์โดเมนถูกแตะ** — ไม่แตะ `order/cart|buildOrder|promptpay`, `expense/`,
`dashboard/metrics`, `domain/catalog`, `order/options`, `comms/*`
`QrCode.tsx` อยู่ใน `src/order/` แต่แก้เฉพาะ `className` ของ `<img>` ไม่แตะ payload
ไม่แตะข้อความ ไม่แตะ `data-testid` ไม่แตะ `aria-label` ไม่แตะ `firestore.*`
