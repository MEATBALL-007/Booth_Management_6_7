# Queue Pro-Upgrade — เกณฑ์ข้อสุดท้าย (audit)

> เกณฑ์: **เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms**
>
> รอบ `auto/Booth_Management_6_7/2026-08-21_0036` · วันที่ 2026-08-21
> ฐานที่ตรวจ: `main` = `735de75` (branch นี้แตกจาก main และไม่มีโค้ดใหม่ นอกจาก AUTOPILOT.md)

## สรุปคำตัดสิน

| ข้ออ้างย่อย | ผล | หลักฐาน |
|---|---|---|
| 1. เทสต์ทั้งชุดเขียว | ✅ ผ่าน | **133 tests / 39 files passed**, exit 0 (รันในรอบนี้) |
| 2. `npm run build` ผ่าน | ✅ ผ่าน | exit 0, `built in 1.30s`, PWA `generateSW`, precache 5 entries |
| 3. ไม่เปลี่ยน logic บัญชี/เมนู/comms | ✅ ผ่าน | production ที่งาน spec นี้แตะมี **4 ไฟล์** ไม่มีไฟล์โดเมนสักไฟล์ |

**เกณฑ์นี้ผ่านครบ 3 ข้ออ้างย่อย → ติ๊กได้** (ติ๊กแล้วที่ `AUTOPILOT.md`)
แต่มี **3 ข้อสังเกตที่ reviewer ต้องอ่าน** อยู่ท้ายเอกสาร — ไม่มีข้อไหนทำให้เกณฑ์ตก
แต่ทั้งสามข้อเป็นของจริงและไม่ควรถูกลืม

---

## 1. เทสต์ทั้งชุดเขียว

```
> vitest run
 Test Files  39 passed (39)
      Tests  133 passed (133)
   Duration  25.76s
[exited with code 0]
```

⚠️ **ตัวเลขในแผนผิด — แก้ไว้ตรงนี้** แผนรอบนี้เขียนว่า "รอบ 0020 รันแล้ว: 148 tests / 40 files"
เลข 148 นั้นเป็นของ **branch `_0020` เอง** ซึ่งมีไฟล์เทสต์ที่ branch นั้นเพิ่ง เขียน
(`DisplayScreen.glanceable.test.tsx` 256 บรรทัด) และ **ไม่เคย merge เข้า main**
บน branch นี้ (= main) จำนวนจริงคือ **133 / 39** ตัวเลขต่างกันเพราะ branch ไม่เคยรวมกัน
ไม่ใช่เพราะเทสต์หาย → **ห้ามเชื่อจำนวนเทสต์ข้าม branch** ต้องรันเองทุกรอบ

## 2. `npm run build`

```
dist/assets/index-CxgB-Y4T.js   851.78 kB │ gzip: 257.58 kB
✓ built in 1.30s
(!) Some chunks are larger than 500 kB after minification.   ← warning ไม่ใช่ error
PWA v1.3.0 · mode generateSW · precache 5 entries (846.04 KiB)
files generated: dist/sw.js, dist/workbox-9c191d2f.js
[exited with code 0]
```

warning เรื่อง chunk > 500 kB **มีอยู่จริงและจงใจไม่แก้** (แก้ = code-splitting = scope creep
และต้องแตะโค้ดที่ไม่เกี่ยวกับ spec นี้เลย) `tsc -b` ผ่านด้วย เพราะ build script คือ `tsc -b && vite build`

## 3. ไม่เปลี่ยน logic บัญชี/เมนู/comms

### 3.1 รายชื่อไฟล์โดเมนของจริง (เช็คจาก `src/` ไม่ใช่เดา)

แผนเขียนไว้ว่าไฟล์ที่ห้ามขยับคือ `src/money/*`, `src/menu/*`, `src/comms/*`, `src/booth/close*`
— **`src/money/`, `src/menu/`, `src/booth/` ไม่มีอยู่จริงในโปรเจคนี้** ของจริงคือ:

| โดเมน | ไฟล์ production จริง |
|---|---|
| **บัญชี / เงิน** | `src/order/cart.ts` · `src/order/buildOrder.ts` · `src/order/promptpay.ts` · `src/order/QrCode.tsx` · `src/expense/expensesRepo.ts` · `src/dashboard/metrics.ts` · `src/screens/DashboardScreen.tsx` |
| **เมนู** | `src/domain/catalog.ts` · `src/order/options.ts` |
| **comms** | `src/comms/` ทั้งโฟลเดอร์ (`commsLogic.ts`, `commsRepo.ts`, `useHeartbeat.ts`, `AlertButtons.tsx`, `BroadcastBar.tsx`, `CommsToast.tsx`, `PresenceBoard.tsx`, `types.ts`) |

(ปิดซุ้ม/expectedCash อยู่ใน `src/expense/` + `src/dashboard/metrics.ts` ไม่ใช่ `src/booth/`)

### 3.2 วิธีตรวจ

ใช้ `git diff --stat main...<branch>` (**สามจุด**) ไม่ใช่สองจุด —
`main` เดินหน้าไปแล้วหลัง branch พวกนี้ถูกตัด (merge `feat/photo-booth-now-shooting` เมื่อ 08-17)
ถ้าใช้สองจุด commit ของ main เองจะโผล่มาเป็น "ไฟล์ที่ branch ลบ" ทำให้อ่านผิด
สามจุด = diff จาก merge-base = "branch นี้เปลี่ยนอะไรบ้าง" พอดี

แล้ว **ตัดไฟล์เทสต์ทิ้ง** (เทสต์เปลี่ยนพฤติกรรม production ไม่ได้) เหลือเฉพาะ production
24 branches × ~400 บรรทัด ยุบเหลือ **4 ไฟล์** ที่ต้องอ่านทีละบรรทัด

### 3.3 ขอบเขตที่ตรวจ — แยก 3 ก้อน

**ก้อน A — งาน spec ที่ merge เข้า main แล้ว** (`4f2a6b9^..81763eb`, 2026-08-04)

```
src/display/queueView.ts · src/display/useServingAlert.ts · src/domain/types.ts
src/i18n/labels.ts · src/queue/queueActions.ts
src/screens/DisplayScreen.tsx · src/screens/QueuePanel.tsx
(+ ไฟล์ .test.* และ docs/superpowers/{specs,plans}/)
```
→ **ไม่มีไฟล์โดเมนสักไฟล์** ✅ (`labels.ts` เป็น i18n string ไม่ใช่ logic เมนู)

**ก้อน B — ทุก branch `auto/*` ที่ยังไม่ merge (24 branch)**

union ของไฟล์ **production** ที่ถูกแตะทั้ง 24 branch มีแค่ 4 ไฟล์:

| ไฟล์ | branch ที่แตะ | เนื้อการเปลี่ยน |
|---|---|---|
| `src/order/ordersRepo.ts` | `13_1553` `18_0009` `19_0017` `19_0039` | `updateOrderStatus` แปลง `undefined` → `deleteField()` เพื่อให้ undo ลบ field ที่เดิมไม่มี |
| `src/queue/queueActions.ts` | `13_1553` `18_0009` `19_0017` `19_0039` | `orderSnapshot` คืนครบทุก field + แยก `cancel()` ออกมา |
| `src/screens/QueuePanel.tsx` | `13_1553` `16_0030` `18_0009` `19_0017` `19_0039` `20_0042` | guard กดซ้ำ (`written` ref), guard cancel บน order ที่จบไปแล้ว, เรียกใช้ `Q.cancel()` |
| `src/screens/DisplayScreen.tsx` | `15_0020` `21_0020` | `data-testid="display-root"`; ห่ออังกฤษใน `<span>` เล็ก/จาง 3 จุด |

→ **ไม่มีไฟล์โดเมนสักไฟล์** ✅ ทั้ง 4 ไฟล์เป็น queue / presentation ล้วน

ไฟล์เทสต์ที่ branch เหล่านี้เพิ่มมี 3 ตัวที่ **ชื่ออยู่ในโดเมนบัญชี/เมนู** —
`src/order/promptpay.pin.test.ts` (`17_0005`), `src/i18n/labels.coverage.test.ts` (`16_0055`),
`src/pwaConfig.test.ts` (`17_0023`) — ทั้งสามเป็น **ไฟล์เทสต์ล้วน ไม่มี production เปลี่ยนคู่มาด้วย**
(ดู `--stat` ของ branch นั้น: มีแค่ `AUTOPILOT.md` + `SUMMARY.md` + ไฟล์ `.test.*`) ✅

**ตรวจเพิ่มอีกชั้น**: `updateOrderStatus` เป็น repo กลางของ collection `orders` ซึ่งเก็บ field เงินด้วย
(`unitPrice`, `total`) การเปลี่ยนเป็น `deleteField()` จึงอาจกระทบ field เงินได้ **ถ้ามีคนเรียกด้วย
`{ total: undefined }`** — grep ทั้ง `src/` แล้ว **caller production มีแค่ `QueuePanel.tsx` 2 จุด**
(`apply()` และ `runUndo()`) ซึ่งส่งเฉพาะ status/timestamp/cancelReason
→ ไปไม่ถึง field เงิน ✅

**ก้อน C — commit บน `main` หลัง spec merge** (ไม่ใช่งาน queue-pro แต่บันทึกไว้ให้ครบ)

- `a895d47` `85f3f60` `8516412` `7197923` — docs ล้วน
- `6d380a8` — เพิ่ม `AUTOPILOT.md` + findings ของ undo
- `0393bd8`/`735de75` — photo booth "กำลังถ่าย / Now Shooting" (`DisplayScreen` + labels) = presentation
- ⚠️ **`17e8c2e` `refactor(config): move PromptPay id and dashboard PIN out of source into env`**
  — **แตะ `src/domain/appConfig.ts` และ `src/dashboard/pinStore.ts` ซึ่งอยู่ในเส้นทางเงิน/แดชบอร์ด**
  แต่ **ไม่ใช่งานของ spec queue-pro-upgrade** (เป็น commit ความปลอดภัยของรอบ 2026-08-13
  ที่ย้าย PromptPay id ออกจาก source เพราะ repo เป็น public) และไม่ได้เปลี่ยน **สูตรคิดเงิน** เลย
  — ย้ายที่มาของค่า config เท่านั้น + เพิ่ม guard fail-closed ให้ `unlockDashboard`
  **จึงไม่ทำให้เกณฑ์ข้อนี้ตก** แต่ดูข้อสังเกต 2 ข้างล่าง มันมีผลข้างเคียงจริงตอน build

---

## ข้อสังเกตที่ยังค้าง (ไม่ทำให้เกณฑ์ตก แต่เป็นของจริง)

### ข้อสังเกต 1 — "เทสต์ทั้งชุดเขียว" พิสูจน์ได้ทีละ branch เท่านั้น ไม่เคยพิสูจน์ตอนรวมกัน

branch ทั้ง 24 อัน **ไม่เคย merge** แต่ละอันเขียวในโลกของตัวเอง
ถ้าวันหนึ่งเอามารวมกัน จะชนกันแน่นอน เพราะ **ชื่อไฟล์เทสต์ซ้ำกันแต่เนื้อในคนละเรื่อง**:

| ไฟล์ | เขียนซ้ำที่ | ต่างกัน |
|---|---|---|
| `QueuePanel.idempotency.test.tsx` | `16_0007` vs `20_0042` | +107 / −90 |
| `DisplayScreen.glanceable.test.tsx` | `16_0055` vs `21_0020` | +224 / −60 |
| `QueuePanel.callSpecific.test.tsx` | `15_0042` vs `20_0031` | +80 / −61 |
| `DisplayScreen.reannounce.test.tsx` | `15_0031` vs `20_0020` | — |
| `undoRoundTrip.test.ts` | `18_0009` `19_0017` `19_0039` | — |

และที่หนักกว่าคือ **conflict เชิงความหมายใน production**: บรรทัด `confirmCancel` ของ
`QueuePanel.tsx` ถูกแก้คนละแบบสองรอบ — `16_0030` ใส่ guard `cancelPatch(order, …)` ที่เช็ค status,
ส่วน `19_0039` เปลี่ยนไปเรียก `Q.cancel(reason)` ที่ย้าย logic ไป `queueActions`
**merge มั่วๆ จะได้อันเดียวและทำอีกอันหาย** ทั้งที่ทั้งคู่แก้บั๊กคนละตัว

→ งานนี้ **ไม่ใช่ของรอบนี้** (นอกขอบเขต "หนึ่งรอบหนึ่งงาน") แต่ควรเป็นงานของรอบใดรอบหนึ่ง:
รวม branch ให้เป็นชุดเดียวแล้วรันเทสต์ทีเดียว ตอนนั้นค่อยพิสูจน์ "ทั้งชุดเขียว" แบบรวมจริงๆ

### ข้อสังเกต 2 — bundle ที่ build บนเครื่องนี้มี `promptpayId` เป็นค่าว่าง

หลัง `17e8c2e` ค่า PromptPay มาจาก `import.meta.env.VITE_PROMPTPAY_ID ?? ''`
บนเครื่องนี้มีแค่ `.env.example` **ไม่มี `.env`** → build ที่เพิ่งรันฝังค่าว่างลงไปจริง:

```
$ grep -o "promptpayId:[^,}]*" dist/assets/index-*.js
promptpayId:``
$ grep -o "dashboardPin:[^,}]*" dist/assets/index-*.js
dashboardPin:``
```

`buildPromptPayPayload` (`src/order/promptpay.ts`) ส่งค่านี้ต่อให้ `promptpay-qr` ตรงๆ **ไม่มี guard**
→ **build ที่ deploy โดยลืมตั้ง env จะได้ QR ที่ปลายทางว่าง แต่ `npm run build` ยัง exit 0**

เทสต์จับไม่ได้ด้วย เพราะ `src/test/setup.ts:7` ยัดค่าปลอม `VITE_PROMPTPAY_ID = '0000000000'`
ทำให้ `appConfig.test.ts:12` (`expect(...).not.toBe('')`) **เขียวเสมอ** ไม่ว่า env จริงจะตั้งหรือไม่

**จงใจไม่แก้ในรอบนี้** เพราะ (ก) เป็นงานคนละข้อ (ข) `.env*` อยู่ใน out of scope
(ค) การใส่ guard ใน `promptpay.ts` = แตะ logic บัญชี ซึ่ง out of scope ตรงๆ
บันทึกไว้ให้รอบที่รับผิดชอบเรื่อง deploy/บัญชีหยิบไปทำ

### ข้อสังเกต 3 — เกณฑ์นี้เป็น "ณ เวลาที่ตรวจ" ไม่ใช่ตลอดไป

ข้อนี้ต่างจากอีก 6 ข้อของ spec ตรงที่ **ไม่มีเทสต์ตัวไหนล็อกมันไว้ได้** —
เทสต์เขียว/build ผ่าน เป็นสถานะที่พังได้ทุก commit และ "ไม่แตะไฟล์โดเมน" เป็นคุณสมบัติของ *diff*
ไม่ใช่ของ *โค้ด* ตัวเลข/ผลในเอกสารนี้จึงผูกกับ `main = 735de75` เท่านั้น
รอบหลังที่อยากอ้างข้อนี้ **ต้องรันใหม่** ทำซ้ำได้ด้วย 3 คำสั่ง:

```sh
npm test && npm run build
git diff --stat main...<branch>          # ทีละ branch, สามจุด
git diff main...<branch> -- <ไฟล์ production ที่โผล่มา>
```
