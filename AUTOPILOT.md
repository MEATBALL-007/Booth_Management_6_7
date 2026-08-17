# AUTOPILOT

## Goal

ระบบนี้ถูกใช้งานจริงในงานซุ้มของโรงเรียน โค้ดเดินมาถึงจุดที่ feature ครบตาม plan แล้ว
(129 tests เขียว, `npm run build` ผ่าน, merge Queue Pro-Upgrade เมื่อ 4 ส.ค.)
แต่ **acceptance criteria 20 ข้อ ใน `docs/superpowers/specs/*-design.md` ยังไม่เคยถูกตรวจอย่างเป็นระบบเลย
— ติ๊กไปแล้ว 0 จาก 20 ข้อ**

"เสร็จ" คือ: ทุกข้อใน 20 ข้อนั้น **ถูกพิสูจน์ด้วยเทสต์อัตโนมัติที่รันได้จริง** หรือถูกบันทึกไว้อย่างชัดเจน
ว่าเป็นช่องว่างที่ยังขาด พร้อมระบุว่าขาดตรงไหน — ไม่มีข้อไหนถูกทิ้งไว้ในสถานะ "ไม่รู้"

## Acceptance criteria

**จาก `2026-08-04-queue-pro-upgrade-design.md`**

- [x] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ✅ รอบ 2026-08-18: เจอบั๊กจริงและแก้แล้ว (`orderSnapshot` คืน field ครบทุกตัว,
      `updateOrderStatus` แปลง `undefined` → `deleteField()`) พิสูจน์ด้วย 19 เทสต์ใหม่:
      round-trip 9 เคสครบทุก action (`src/queue/undoRoundTrip.test.ts`) + 7 เคสระดับ UI
      (`src/screens/QueuePanelUndo.test.tsx`) ทั้งหมดใช้ `toStrictEqual` บน mock.calls
      บันทึกการวิเคราะห์เดิมอยู่ที่ `docs/autopilot/2026-08-13-undo-audit-findings.md`
      **⚠️ งานนี้อยู่บน branch `auto/Booth_Management_6_7/2026-08-18_0009` ยังไม่ merge เข้า main**
- [x] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
      — ✅ รอบ 2026-08-18: เกณฑ์นี้ **ผ่านครบทุกท่อนโดยไม่ต้องแก้โค้ดเลย** แต่เดิมมี 2 ท่อนที่ไม่มีเทสต์
      พิสูจน์ จึงเขียนเพิ่ม 11 เทสต์ในไฟล์ใหม่ 2 ไฟล์ (ไม่แตะไฟล์เทสต์เดิม เลี่ยง merge conflict):
      1. ข้าม → `skipped` — เดิมมีแล้ว: `queueActions.test.ts:32`, `QueuePanel.test.tsx:85`
      2. หายจากจอลูกค้า — **เดิมเป็นช่องว่าง** → `src/screens/DisplaySkipped.test.tsx` (3 เทสต์)
      3. ขึ้นโซนพักไว้ — เดิมครอบคลุมโดยบังเอิญ → `src/screens/QueueParkedZone.test.tsx` (5 เทสต์)
      4. เรียกซ้ำ → Display ประกาศ chime+flash — **เดิมเป็นช่องว่างที่ใหญ่ที่สุด**
         (เทสต์เดิมพิสูจน์แค่ค่า patch ไม่เคยพิสูจน์ว่าจอประกาศจริง) → `DisplaySkipped.test.tsx` (3 เทสต์)
      เทสต์ทั้ง 11 ผ่าน mutation check แล้ว (ดู SUMMARY.md) — ไม่ใช่เทสต์ที่เขียวเพราะไม่ได้ทดสอบอะไร
- [ ] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
- [ ] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
- [ ] Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
- [ ] Display: จัดกึ่งกลางทุกจอ (responsive), "เตรียมตัว" callout เด่น, skipped ไม่โชว์
- [ ] Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ (สี+ไอคอน+ขนาด; ไทยเด่น อังกฤษรอง)
- [ ] เทสต์ทั้งชุดเขียว + `npm run build` ผ่าน; ไม่เปลี่ยน logic บัญชี/เมนู/comms

**จาก `2026-08-03-ui-overhaul-design.md`**

- [ ] ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)
- [ ] อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ — ไม่มี horizontal scroll, touch target ≥44px
- [ ] tests เขียวครบ + `npm run build` ผ่าน + PWA generate
- [ ] Firestore/logic ไม่เปลี่ยน (diff เฉพาะ presentation + Tailwind config + src/ui)
- [ ] Display เลขคิวสเกลใหญ่ตามจอด้วย clamp

**จาก `2026-07-24-hq-comms-crosssell-design.md`**

- [ ] HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime; ปิดเครื่องนึง อีกเครื่องทำงานครบ
- [ ] ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้
- [ ] HQ toggle Happy-Hour → Order Station คิดราคาใหม่ + Display ขึ้นป้าย; order บันทึก unitPrice จริง
- [ ] Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่
- [ ] ปิดซุ้ม → expectedCash ตรงกับ Σ เงินสด, กรอกเงินจริง → diff บันทึกถูก
- [ ] Passport: สแกนครบ 3 ซุ้ม → ขึ้นรางวัล; สแกนซุ้มเดิมซ้ำไม่เพิ่มแสตมป์; offline แล้ว sync ได้
- [ ] ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน

## Verify

```
npm test && npm run build
```

## Out of scope

- **ห้ามแก้ `firestore.rules` และ `firestore.indexes.json`** — เป็นความปลอดภัยของข้อมูลจริง
- **ห้ามเปลี่ยน logic บัญชี / เมนู / comms** — spec เองระบุข้อนี้เป็นเกณฑ์
- **ห้ามแก้ไฟล์ใน `docs/superpowers/specs/`** — เป็นเกณฑ์อ้างอิงที่ใช้ตัดสิน ห้ามแก้เกณฑ์ให้เข้ากับโค้ด
- ห้ามเพิ่ม dependency ใหม่
- ห้ามแตะ `.env*`, `.firebaserc`
- อย่าติ๊ก checkbox ใน `docs/` (ธรรมเนียมนี้ไม่ถูกใช้ในโปรเจคนี้ — ติ๊กที่ไฟล์นี้ไฟล์เดียว)

## Next task — do ONLY this

ตรวจข้อ **ประกาศซ้ำ** ของ `2026-08-04-queue-pro-upgrade-design.md`:

> กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

สถานะที่รู้แล้วจากรอบ No-show (2026-08-18) — **ไม่ต้องวิเคราะห์ซ้ำ**:
- `Q.reannounce(order, now)` คืน `{ announcedAt: now }` เฉพาะเมื่อ status เป็น `serving`
  (มีเทสต์แล้วที่ `queueActions.test.ts:41-44`)
- ปุ่ม "🔔 ประกาศซ้ำ" ใน `QueuePanel.tsx:74` มีเทสต์ระดับ UI แล้วที่ `QueuePanel.test.tsx:98`
  แต่ใช้ `objectContaining` — ยังไม่พิสูจน์ว่า patch **ไม่มี field เกิน**
- ฝั่ง Display: `newlyAnnounced` ยิงเมื่อ `announcedAt` เพิ่มขึ้น และรอบ No-show ได้พิสูจน์แล้วว่า
  announcedAt ที่เด้งทำให้ **chime + flash จริง** ที่ `DisplaySkipped.test.tsx`
  ("recall still announces when skip and recall collapse into one snapshot")

เหลือช่องว่างจริงแค่ 2 จุด — งานรอบนี้จึงควรเล็ก:
1. เทสต์ระดับ Display ที่ตั้งชื่อ/เล่าเรื่องเป็น "ประกาศซ้ำ" โดยตรง (serving เดิม → announcedAt เด้ง
   → chime + flash) และเคส **announcedAt เท่าเดิม → ต้องไม่ประกาศ** (กัน re-render ยิงเสียงมั่ว)
2. `updateOrderStatus.mock.calls` ของปุ่มประกาศซ้ำ ด้วย `toStrictEqual` ว่าเป็น
   `{ announcedAt: <number> }` **เท่านั้น** — ห้ามพก `status`/`servingAt` ติดไปด้วย
   (ถ้าพกไป undo/idempotency จะเพี้ยน)

เขียนใน **ไฟล์ใหม่** (เช่น `src/screens/DisplayReannounce.test.tsx`) ตามธรรมเนียมรอบก่อนๆ
และ **mutation-check** เทสต์ที่เขียวตั้งแต่รันแรกเสมอ ก่อนจะเชื่อว่ามันพิสูจน์อะไรได้

**commit ระหว่างทางเป็นระยะ**

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ **เรียกเจาะจง**)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
