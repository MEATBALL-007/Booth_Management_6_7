# รอบ 2026-08-21_0036 — audit เกณฑ์ข้อสุดท้ายของ spec queue-pro-upgrade

> เกณฑ์: **เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms**
> **ผล: ผ่านครบ 3 ข้ออ้างย่อย → ติ๊กแล้ว** · spec `queue-pro-upgrade` ครบ 7/7 ข้อ

## What I did

- **sync `AUTOPILOT.md` จาก branch `_0020` ก่อนทำงาน** (working copy ยังเป็นแผนเก่าของ main
  ขาดไป 196 บรรทัด) — commit `43a5323`
- **รัน verify เอง ไม่เชื่อเลขในแผน**: `npm test` → **133 tests / 39 files passed, exit 0**;
  `npm run build` → exit 0, `built in 1.30s`, PWA `generateSW`, precache 5 entries
- **audit ข้อ "ไม่เปลี่ยน logic บัญชี/เมนู/comms" ครบทั้ง 3 ก้อน**: (A) งาน spec ที่ merge เข้า main
  แล้ว `4f2a6b9^..81763eb` (B) **auto branch ทั้ง 24 อันที่ไม่เคย merge** (C) commit บน main
  หลัง merge → union ของไฟล์ **production** ที่งาน spec นี้แตะมี**แค่ 4 ไฟล์**
  (`order/ordersRepo.ts`, `queue/queueActions.ts`, `screens/QueuePanel.tsx`,
  `screens/DisplayScreen.tsx`) **ไม่มีไฟล์บัญชี/เมนู/comms สักไฟล์** — อ่าน diff ทั้ง 4 ไฟล์ทีละบรรทัด
- **เขียนผลลง `docs/autopilot/2026-08-21-queue-pro-final-audit.md`** (commit `14fe3f3`)
  ให้รอบหลังใช้ซ้ำได้ + ติ๊ก checkbox และเขียน handoff ข้อถัดไป (commit `e396c93`)
- **ไม่แก้โค้ด production เลยสักบรรทัด** — รอบนี้เป็น audit ล้วน (`git diff main...HEAD` แตะแค่
  `AUTOPILOT.md`, `SUMMARY.md`, `docs/autopilot/`)

## Why

- **ใช้ `git diff main...<branch>` สามจุด ไม่ใช่สองจุด**: `main` เดินหน้าไปแล้วหลัง branch พวกนี้
  ถูกตัด (merge photo-booth 08-17) สองจุดจะทำให้ commit ของ main โผล่มาเป็น "ไฟล์ที่ branch ลบ"
  อ่านผิดทันที สามจุด = diff จาก merge-base พอดี **และไม่ต้องใช้ `$(git merge-base …)`**
  ซึ่งจำเป็นเพราะ shell ในกล่องนี้บล็อก command substitution กับ `$var`
- **ตัดไฟล์เทสต์ทิ้งก่อนอ่าน diff**: เทสต์เปลี่ยนพฤติกรรม production ไม่ได้ เกณฑ์ข้อนี้จึงอยู่ใน
  production diff เท่านั้น → 24 branch × ~400 บรรทัด ยุบเหลือ 4 ไฟล์ที่อ่านจริงได้ในรอบเดียว
- **ตรวจ caller ด้วย ไม่ใช่แค่ชื่อไฟล์**: `updateOrderStatus` เป็น repo กลางของ collection `orders`
  ซึ่งเก็บ field เงิน (`unitPrice`, `total`) การเปลี่ยนเป็น `deleteField()` **จะกระทบเงินได้ถ้ามีคน
  ส่ง `{total: undefined}`** — grep แล้ว caller production มีแค่ `QueuePanel` 2 จุด ส่งเฉพาะ
  status/timestamp/cancelReason → สรุปได้ว่าไปไม่ถึงเงินจริง ไม่ใช่แค่เดาจากชื่อไฟล์
- **ชื่อไฟล์โดเมนในแผนเดาผิด** (`src/money/`, `src/menu/`, `src/booth/` **ไม่มีอยู่จริง**)
  จึงไล่ `src/` เอาของจริงมาทำตารางไว้ในเอกสาร audit ก่อนตัดสิน

## Verification

รันเองในรอบนี้ (คำสั่ง Verify เต็ม `npm test && npm run build`):

```
 Test Files  39 passed (39)
      Tests  133 passed (133)
[exited with code 0]

dist/assets/index-CxgB-Y4T.js   851.78 kB │ gzip: 257.58 kB
✓ built in 1.30s
(!) Some chunks are larger than 500 kB after minification.      ← warning ไม่ใช่ error
PWA v1.3.0 · mode generateSW · precache 5 entries (846.04 KiB)
[exited with code 0]
```

⚠️ **แก้ตัวเลขในแผน**: แผนบอก "รอบ 0020 รันแล้ว 148 tests / 40 files" — เลขนั้นเป็นของ
**branch `_0020` เอง** ซึ่งมีไฟล์เทสต์ที่ branch นั้นเพิ่งเขียนและ**ไม่เคย merge**
บน branch นี้ (= main) จำนวนจริงคือ **133 / 39** ไม่มีเทสต์หาย — branch ไม่เคยรวมกันต่างหาก

หลักฐานข้อ "ไม่แตะโดเมน" (ตารางเต็มอยู่ในเอกสาร audit):

| ก้อน | ไฟล์ production ที่แตะ | มีไฟล์บัญชี/เมนู/comms ไหม |
|---|---|---|
| A: merge แล้ว `4f2a6b9^..81763eb` | queueView, useServingAlert, types, labels, queueActions, DisplayScreen, QueuePanel | ไม่มี ✅ |
| B: 24 branch ที่ยังไม่ merge | ordersRepo, queueActions, QueuePanel, DisplayScreen | ไม่มี ✅ |
| C: main หลัง merge | DisplayScreen (photo booth) + `17e8c2e` appConfig/pinStore | มี แต่**ไม่ใช่งาน spec นี้** ดู Risk |

## What I did NOT do

- **ไม่แก้ warning "chunk > 500 kB"** — เป็น warning ไม่ใช่ error และแผนสั่งห้ามไล่แก้ (scope creep)
- **ไม่เขียนเทสต์ใหม่** — เกณฑ์ข้อนี้เป็น audit ไม่ใช่ฟีเจอร์ และ "เทสต์เขียว/build ผ่าน/diff ไม่แตะ
  โดเมน" เป็นคุณสมบัติของ *สถานะ* กับ *diff* ไม่มีเทสต์ตัวไหนล็อกไว้ได้ (บันทึกข้อจำกัดนี้ไว้แล้ว)
- **ไม่ merge branch ไหนเข้าด้วยกัน** ทั้งที่พบว่า "ทั้งชุดเขียว" ไม่เคยถูกพิสูจน์ตอนรวม — คนละงาน
  และเกินขอบเขต "หนึ่งรอบหนึ่งงาน" บันทึกเป็นข้อสังเกต 1 ในเอกสาร audit แทน
- **ไม่แก้เรื่อง `promptpayId` ว่าง** (Risk ข้อ 2) — `.env*` อยู่ใน out of scope ตรงๆ และการใส่ guard
  ใน `promptpay.ts` คือการแตะ logic บัญชี ซึ่งเป็นสิ่งที่เกณฑ์ข้อนี้ห้ามเอง

## Risk

1. **"เทสต์ทั้งชุดเขียว" พิสูจน์ได้ทีละ branch เท่านั้น — ไม่เคยพิสูจน์ตอนรวม** branch ทั้ง 24 อัน
   ไม่เคย merge ถ้าเอามารวมจะชนกันแน่: ชื่อไฟล์เทสต์ซ้ำแต่เนื้อในคนละแบบหลายคู่
   (`QueuePanel.idempotency.test.tsx` `16_0007` vs `20_0042` ต่างกัน +107/−90;
   `DisplayScreen.glanceable.test.tsx` `16_0055` vs `21_0020` ต่างกัน +224/−60;
   `callSpecific`, `reannounce`, `undoRoundTrip` ก็ซ้ำ) และหนักกว่านั้นคือ **conflict เชิงความหมาย**:
   บรรทัด `confirmCancel` ใน `QueuePanel.tsx` ถูกแก้คนละทางที่ `16_0030` (guard เช็ค status)
   กับ `19_0039` (ย้ายไป `Q.cancel()`) — **merge มั่วๆ จะทำให้บั๊กที่แก้ไปแล้วอันหนึ่งกลับมา**
   → reviewer ควรถือว่าเครื่องหมายติ๊กข้อนี้แปลว่า "เขียวบนฐาน `main = 735de75`" เท่านั้น
2. **bundle ที่ build บนเครื่องนี้มี `promptpayId` เป็นค่าว่างจริง** — ยืนยันจาก dist โดยตรง:
   `grep -o "promptpayId:[^,}]*" dist/assets/index-*.js` → `promptpayId:\`\``
   (เครื่องนี้มีแค่ `.env.example` ไม่มี `.env`) `buildPromptPayPayload` ส่งค่านี้ต่อให้ `promptpay-qr`
   **ไม่มี guard** → deploy โดยลืมตั้ง `VITE_PROMPTPAY_ID` จะได้ QR ปลายทางว่างแต่ build ยัง exit 0
   และ **เทสต์จับไม่ได้** เพราะ `src/test/setup.ts:7` ยัดค่าปลอมไว้ ทำให้
   `appConfig.test.ts:12` (`expect(...).not.toBe('')`) เขียวเสมอ — เป็นเทสต์ที่ผ่านแบบ vacuous
   **ไม่ใช่ของใหม่ที่รอบนี้ทำ** (มาจาก `17e8c2e` บน main) และไม่ทำให้เกณฑ์ตกเพราะไม่ใช่งาน spec นี้
   แต่เป็นความเสี่ยงตอน deploy จริงที่ reviewer ควรรู้
3. **`17e8c2e` แตะไฟล์ในเส้นทางเงินจริง** (`src/domain/appConfig.ts`, `src/dashboard/pinStore.ts`)
   ผมตัดสินว่า **ไม่ทำให้เกณฑ์ตก** เพราะ (ก) เป็น commit ของรอบ 2026-08-13 เรื่องเอา secret
   ออกจาก source ไม่ใช่งาน queue-pro-upgrade (ข) ไม่ได้เปลี่ยนสูตรคิดเงิน แค่ย้ายที่มาของค่า config
   **นี่เป็นการตัดสินเชิงตีความ ไม่ใช่ข้อเท็จจริง** — ถ้า reviewer ตีความว่าเกณฑ์คลุมทุก commit
   ที่ลงบน main ระหว่างช่วง spec ข้อนี้ต้องถูกมองใหม่ ผมจึงบันทึก commit นี้ไว้ชัดๆ ไม่กลบ
4. **ledger การติ๊กกระจัดกระจายข้าม branch — "ทำไปกี่ข้อ" ตอบไม่ได้ถ้าไม่ระบุ branch**
   เจอระหว่าง audit: `AUTOPILOT.md` ที่สายนี้รับช่วงมาแสดง **Undo / No-show / ประกาศซ้ำ ยังไม่ติ๊ก**
   แต่ `git show auto/…/2026-08-20_0009:AUTOPILOT.md` ติ๊ก Undo + No-show ไปแล้ว
   และ `…/2026-08-19_0039` ติ๊ก Undo — โดยมีโค้ด+เทสต์รองรับจริงบน branch เหล่านั้น
   (Undo → `13_1553` `18_0009` `19_0017` `19_0039`; No-show → `18_0026` `20_0009`;
   ประกาศซ้ำ → `15_0031` `18_0036` `20_0020`) สาเหตุ: ทุกรอบ adopt แผนจาก branch ก่อนหน้า
   **สายเดียว** พอมีสองสายวิ่งคู่ การติ๊กของอีกสายก็หายไป — งานไม่หาย แต่ ledger หาย
   **จงใจไม่ติ๊กให้ในรอบนี้** เพราะยังไม่ได้ตรวจ 3 ข้อนั้นเอง และ goal ของโปรเจคห้ามติ๊กตามคำอ้าง
   → เสนอให้รอบใดรอบหนึ่ง reconcile ledger ทีเดียว (บันทึกไว้เป็นข้อสังเกต 3 ในเอกสาร audit)
5. **หลักฐานเป็นระดับ diff ไม่ใช่ระดับพฤติกรรม** — ผมพิสูจน์ว่า *ไฟล์* บัญชี/เมนู/comms ไม่ถูกแก้
   (+ ตรวจ caller ของ repo กลางเพิ่มอีกชั้น) แต่**ไม่ได้รันเทสต์เชิงพฤติกรรมของโดเมนบัญชี**
   เพื่อยืนยันว่าตัวเลขเงินยังออกเท่าเดิม — เทสต์บัญชีที่มีอยู่เดิมเขียวอยู่ใน 133 ตัวนั้น
   ก็ถือเป็นหลักฐานทางอ้อมได้ระดับหนึ่ง แต่ไม่ใช่การเทียบ before/after ที่ตั้งใจทำ
