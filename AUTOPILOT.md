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

- [ ] Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)
      — ⚠️ รอบวันที่ 2026-08-13 **ทำงานนี้เสร็จแล้วและเจอบั๊กจริง แต่โค้ดถูกลบทิ้งเพราะบั๊กของ runner เอง**
      (agent commit ไม่ได้เพราะเครื่องไม่มี git identity แล้ว runner สั่ง `checkout --force` ทับ)
      **ผลการวิเคราะห์ทั้งหมดรอดมาแล้วที่ `docs/autopilot/2026-08-13-undo-audit-findings.md`**
      ซึ่งระบุบั๊ก ไฟล์ที่ต้องแก้ และวิธีเขียนเทสต์ไว้ครบ — ใช้เป็นสเปกทำซ้ำได้เลย ไม่ต้องวิเคราะห์ใหม่
- [ ] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
- [ ] ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
- [x] เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
      — ✅ รอบ 2026-08-20 (0031): โค้ดถูกอยู่แล้ว ไม่ต้องแก้ production เลย ช่องว่างอยู่ที่เทสต์ล้วนๆ
      เพิ่ม 9 เทสต์ที่ `src/screens/QueuePanel.callSpecific.test.tsx` (4)
      + `src/screens/DisplayScreen.callSpecific.test.tsx` (5) — commit `d2f47b2`, `aa260fc`
      พิสูจน์ว่าไม่ vacuous ด้วยการ break โค้ด 10 แบบ **ทุกเทสต์ทั้ง 9 ตัวถูกฆ่าอย่างน้อย 1 แบบ**
      **หลักฐานว่าช่องว่างเป็นของจริง**: ใส่ `doneAt` ปลอมเข้าไปใน patch ที่ QueuePanel ส่งให้
      `updateOrderStatus` (ระดับ panel ไม่ใช่ระดับ pure function) → เทสต์ใหม่แดง 1 ตัว
      แต่เทสต์เดิมทั้ง `QueuePanel.test.tsx` + `queueActions.test.ts` **เขียวครบ 16 ตัว**
      เพราะ `objectContaining` มองข้าม field ส่วนเกิน (`updateOrderStatus` เป็น merge → ติดลง doc จริง)
      → เทสต์ใหม่ใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls` ทั้งลิสต์แทน
      หมายเหตุ: guard `status !== 'waiting'` ของ `callSpecific` **ไปไม่ถึงจาก UI** เพราะปุ่ม `เรียก`
      ถูก render เฉพาะการ์ด waiting เท่านั้น (มีเทสต์ล็อกไว้แล้ว) — เป็น defence ชั้นสอง
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

## Next task

ตรวจข้อ **Idempotency** ให้จบ:

> กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)

⚠️ **บรรทัด "Next task" ในไฟล์นี้ค้างอยู่ที่ข้อ Undo มาหลายรอบแล้ว** (working copy stale ตามที่
memory เตือน) — รอบนี้เขียนทับให้แล้ว ถ้าเจอว่าค้างอีกให้เชื่อ checkbox ด้านบนเป็นหลัก

สถานะที่สำรวจไว้แล้วรอบ 2026-08-20 (0031) — **สำรวจบน branch นี้เอง ไม่ต้องสำรวจซ้ำ**:
- guard ระดับ pure function มีครบและมีเทสต์แล้วทุกตัวใน `src/queue/queueActions.ts`:
  `callNext` คืน null เมื่อไม่มี waiting, ส่วน `callSpecific`/`markDone`/`skip`/`recall`/`reannounce`
  คืน null เมื่อ status ไม่ตรง — เทสต์อยู่ที่ `src/queue/queueActions.test.ts:18-34`
- ฝั่ง UI: `apply()` ใน `QueuePanel.tsx:24-28` ทำ `if (!patch) return` → guard ที่คืน null
  กลายเป็น no-op จริง **ไม่มีเทสต์ระดับ UI ยืนยันบรรทัดนี้เลย**
- รอบนี้พิสูจน์แล้วว่าปุ่ม `เรียก` ถูก render เฉพาะการ์ด waiting → guard ของ `callSpecific`
  ไปไม่ถึงจากการกดปุ่ม ดู `src/screens/QueuePanel.callSpecific.test.tsx:107`

**ช่องว่างที่เหลือจริงๆ มี 3 จุด:**
1. **กดซ้ำเร็วๆ (double-click) บนปุ่มเดียวกัน** — UI ยัง render การ์ดเดิมอยู่จนกว่า Firestore
   จะ echo กลับมา ดังนั้นคลิกที่สองยิง `updateOrderStatus` ซ้ำด้วย patch เดียวกันได้
   นี่คือ **บั๊กที่มีโอกาสเป็นของจริง** ไม่ใช่แค่ช่องว่างเทสต์ — ตรวจก่อนว่า `apply()`
   กันซ้ำหรือเปล่า (ตอนนี้ดูเหมือน **ไม่กัน**) ถ้าไม่กันจริง ให้ตัดสินใจว่าจะแก้หรือบันทึกเป็นช่องว่าง
2. **สองเครื่องพร้อมกัน** — เครื่อง B ยังถือ snapshot เก่า (order = waiting) แล้วกด `เรียก`
   หลังเครื่อง A ดึงไปแล้ว → `callSpecific` ที่ฝั่ง B เห็น status เก่าจึงคืน patch ไม่ใช่ null
   ทดสอบได้ด้วยการ emit snapshot เก่าค้างไว้แล้วกด (จำลอง lag) — ต้องระบุให้ชัดว่า
   guard นี้เป็น **client-side เท่านั้น** ไม่มี transaction/compare-and-set ที่ Firestore
   (ห้ามแก้ `firestore.rules` — out of scope)
3. **`เรียกคิวถัดไป` กดรัวๆ** — ปุ่ม disabled เมื่อ `waiting.length === 0` เท่านั้น
   กดสองครั้งก่อน echo กลับ → ดึง o1 ซ้ำสองรอบ (ไม่ใช่ o1 แล้ว o2) ยังไม่มีเทสต์

**กับดักที่เจอแล้ว (อย่าพลาดซ้ำ):**
- ปุ่ม label ไทย `เรียก` / `เรียกคิวถัดไป` / `เรียกซ้ำ` ขึ้นต้นเหมือนกัน → **ต้องใช้ `/^เรียก$/`**
- ใช้ `toStrictEqual` บน `updateOrderStatus.mock.calls` ทั้งลิสต์ ไม่ใช่ `objectContaining`
  — รอบนี้พิสูจน์แล้วว่า `objectContaining` ปล่อย field ส่วนเกินผ่านได้จริง (เทสต์เดิม 16 ตัวเขียวหมด)
  การ assert ทั้งลิสต์ยังจับ "ยิงซ้ำสองครั้ง" ได้ด้วย ซึ่งตรงกับข้อนี้พอดี
- `Date.now` ให้ล็อกด้วย `vi.spyOn(Date, 'now').mockReturnValue(...)` **อย่าใช้ fake timers**
  เพราะ `userEvent` ถือ timer ของตัวเอง สลับแล้วเทสต์ค้าง

สิ่งที่ต้องทำ: เพิ่ม `src/screens/QueuePanel.idempotency.test.tsx` **เป็นไฟล์ใหม่แยก**
ถ้าเจอว่าเป็นบั๊กจริง (ข้อ 1/3) ให้แก้ production ด้วย ไม่ใช่แค่บันทึก
**ต้อง break โค้ดดูว่าเทสต์แดงจริงทุกตัว** แล้ว revert

**commit ระหว่างทางเป็นระยะ** — เครื่องมี git identity แล้ว ไม่มีอะไรขวางการ commit อีก

⚠️ **เรื่อง branch (สำคัญกว่าตัวงาน)**: runner แตก branch ใหม่จาก `main` ทุกรอบ และ **ไม่เคย merge
กลับ** → **ก่อนเริ่มงาน ให้ `git log --all --oneline` ดูก่อนเสมอ** ว่าเกณฑ์ข้อนั้นมีคนทำไว้แล้วหรือยัง
(รอบนี้เช็คแล้ว: ไม่มี branch ไหนเคยแตะ callSpecific/idempotency เลย)

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ "Display: จัดกึ่งกลางทุกจอ")

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
