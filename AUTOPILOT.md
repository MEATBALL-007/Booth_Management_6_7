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
- [x] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
      — ✅ รอบ 2026-08-18: เกณฑ์นี้ **ผ่านโดยไม่ต้องแก้โค้ดเลย** เขียนเพิ่ม 12 เทสต์ในไฟล์ใหม่ 2 ไฟล์
      (ไม่แตะไฟล์เทสต์เดิม เลี่ยง merge conflict):
      1. `src/screens/QueuePanelReannounce.test.tsx` (5 เทสต์) — ปิดช่องว่างที่แผนระบุไว้:
         เทสต์เดิม `QueuePanel.test.tsx:98` ใช้ `objectContaining` ซึ่งมองข้าม field ส่วนเกิน
         ไฟล์ใหม่ใช้ `toStrictEqual` บน `mock.calls` พิสูจน์ว่า patch เป็น `{ announcedAt }` **เท่านั้น**
      2. `src/screens/DisplayReannounce.test.tsx` (7 เทสต์) — พิสูจน์ระดับจอจริง: order ที่ serving อยู่แล้ว
         และยัง serving ต่อ เมื่อ announcedAt เด้ง → chime + flash จริง, กดซ้ำได้เรื่อยๆ,
         ไฟดับเองหลังหมดเวลา, และเงียบเมื่อ announcedAt เท่าเดิม/ย้อนหลัง
      ผ่าน mutation check 5 แบบ (ดู SUMMARY.md) — **ที่สำคัญ**: mutation ที่ทำให้ `reannounce`
      พก `status`/`servingAt` ติดไปด้วย ทำให้ไฟล์ใหม่แดง แต่ `QueuePanel.test.tsx` เดิม **เขียวสนิท**
      ซึ่งพิสูจน์ว่าช่องว่างที่แผนระบุไว้เป็นเรื่องจริง
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

ตรวจข้อ **เรียกเจาะจง** ของ `2026-08-04-queue-pro-upgrade-design.md`:

> กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)

สถานะที่รู้แล้วจากรอบ ประกาศซ้ำ (2026-08-18) — **ไม่ต้องวิเคราะห์ซ้ำ**:
- `Q.callSpecific(order, now)` คืน `{ status: 'serving', servingAt: now, announcedAt: now }`
  เฉพาะเมื่อ status เป็น `waiting` — **มีเทสต์ระดับ unit ครบแล้ว** ที่ `queueActions.test.ts:22-25`
  (ทั้งเคสผ่านและเคส guard คืน null) ข้อนี้ไม่ต้องทำอะไรเพิ่ม
- ปุ่ม "เรียก" อยู่ที่ `QueuePanel.tsx:88` บนการ์ด waiting ทุกใบ
- **ช่องว่างจริงคือระดับ UI**: `QueuePanel.test.tsx` **ไม่มีเทสต์ callSpecific เลยแม้แต่ตัวเดียว**
  (grep แล้วไม่เจอ) — เทสต์เดียวที่ใกล้เคียงคือ "call next" ซึ่งพิสูจน์แค่ว่าเรียก**ใบแรก** ได้

สิ่งที่ต้องพิสูจน์ (ตัวที่สำคัญที่สุดคือข้อ 1 — เป็นหัวใจของเกณฑ์):
1. **"ข้ามลำดับได้"** — มี waiting 3 ใบ (createdAt 1, 2, 3) กด "เรียก" บน**ใบที่สาม**
   ต้องได้ `updateOrderStatus` ที่ id ของใบที่สาม ไม่ใช่ใบแรก
   (เทียบกับปุ่ม "เรียกคิวถัดไป" ที่ต้องได้ใบแรกเสมอ — ควรมีเทสต์คู่กันให้เห็นความต่าง)
2. patch ด้วย `toStrictEqual` บน `mock.calls` = `{ status: 'serving', servingAt, announcedAt }`
   **เท่านั้น** — ห้ามใช้ `objectContaining` (เหตุผลเดียวกับรอบที่แล้ว)
3. ฝั่ง Display: เลขที่ถูกเรียกเจาะจงต้องขึ้นโซน serving + chime
   (`newlyAnnounced` เจอเลขใหม่ → ประกาศ) และต้องหลุดจากโซน up-next
4. เรียกซ้ำบนใบที่ serving อยู่แล้ว → guard คืน null → **ต้องไม่มีการเขียน Firestore เลย**
   (`expect(updateOrderStatus).not.toHaveBeenCalled()`) — แต่ระวัง: ปุ่มอาจไม่ถูก render
   สำหรับ serving อยู่แล้ว ถ้าเป็นแบบนั้นให้พิสูจน์ว่าปุ่มไม่มี แทนที่จะบังคับกด
   (ข้อนี้ทับกับเกณฑ์ Idempotency ข้อถัดไป — ทำเท่าที่เกี่ยวกับ callSpecific พอ อย่าเลยขอบเขต)

เขียนใน **ไฟล์ใหม่** (เช่น `src/screens/QueuePanelCallSpecific.test.tsx` และถ้าต้องแตะฝั่งจอ
ก็ `src/screens/DisplayCallSpecific.test.tsx`) ตามธรรมเนียมรอบก่อนๆ — branch อื่นที่ยังไม่ merge
เป็นเจ้าของไฟล์เทสต์เดิมอยู่

**mutation-check เทสต์ที่เขียวตั้งแต่รันแรกเสมอ** ก่อนจะเชื่อว่ามันพิสูจน์อะไรได้ —
และถ้า mutation แล้วเทสต์ยังเขียว **อย่าเพิ่งสรุปว่าเทสต์อ่อน** ให้หาสาเหตุก่อน รอบนี้เจอกรณีที่
mutation ไม่ทำให้แดงเพราะโค้ดท่อนนั้น**เข้าไม่ถึงจากระดับจอ** (useServingAlert memo ด้วย key
ที่สร้างจาก serving เท่านั้น) ไม่ใช่เพราะเทสต์ไม่ดี — แล้วค่อยเขียนเทสต์ที่เข้าถึงท่อนนั้นจริงๆ

**commit ระหว่างทางเป็นระยะ**

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ **Idempotency**)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
