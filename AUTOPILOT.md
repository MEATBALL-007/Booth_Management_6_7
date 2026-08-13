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
      — ✅ **ผ่านแล้วเมื่อ 2026-08-13** (commit `ecfff72`) เจอบั๊กจริงและแก้แล้ว:
      `orderSnapshot` เก็บเฉพาะ field ที่มีค่า + Firestore `updateDoc` เป็น merge
      → field ที่ action สร้างขึ้นมาเองรอดจากการ undo เสมอ
      พิสูจน์ด้วย round-trip test 9 เคส (ทุก action × ทุก state ที่กดถึงได้) + 3 เคสระดับ UI
      + 1 เคส pin การแปลง `undefined → deleteField()` ที่ repo layer
      ยืนยัน red phase แล้ว (9 เทสต์ล้มก่อนแก้ ตรงกับที่เอกสาร audit ทำนายไว้เป๊ะ)
- [ ] No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)
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

## Next task

ตรวจข้อ **No-show** ของ `2026-08-04-queue-pro-upgrade-design.md`:

> No-show: ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้);
> เรียกซ้ำ → serving + Display ประกาศ (chime+flash)

เกณฑ์ข้อนี้มี 4 ท่อน ต้องพิสูจน์ให้ครบทุกท่อน **อย่าหยุดแค่ท่อนที่เทสต์เดิมครอบอยู่แล้ว**:
1. `skip` บน serving → `skipped` — `queueActions.test.ts` + `QueuePanel.test.tsx` ครอบแล้ว
   (ยืนยันอีกครั้ง ไม่ต้องเขียนใหม่)
2. **skipped หายจากจอลูกค้า** — ต้องเป็นเทสต์ใน `src/screens/DisplayScreen.test.tsx`
   ว่า order สถานะ `skipped` ไม่ถูก render เลย (นี่คือท่อนที่น่าจะยังขาดที่สุด)
3. **ขึ้นโซนพักไว้** ใน QueuePanel — มี UI อยู่แล้ว (`L('queue.parked')`) เช็คว่ามีเทสต์ครอบไหม
4. **เรียกซ้ำ → Display ประกาศจริง (chime + flash)** — `recall` เซ็ต `announcedAt` ใหม่ แต่ต้อง
   พิสูจน์ว่า DisplayScreen ตอบสนองต่อ `announcedAt` ที่เปลี่ยน ด้วยการเล่นเสียง + flash
   ให้อ่าน `DisplayScreen.tsx` ก่อนว่า trigger ผูกกับอะไร (announcedAt? status?) แล้วเขียนเทสต์ตามจริง

เขียนเทสต์เฉพาะท่อนที่ยังขาด ถ้าท่อนไหนโค้ดยังไม่รองรับจริง ให้บันทึกเป็นช่องว่างใน SUMMARY.md
พร้อมระบุว่าขาดตรงไหน (ตาม Goal: ห้ามทิ้งข้อไหนไว้ในสถานะ "ไม่รู้")

**commit ระหว่างทางเป็นระยะ** — รอบ 2026-08-13 ยืนยันแล้วว่า git identity ใช้งานได้

จบรอบแล้วอัปเดตบรรทัดนี้เป็นเกณฑ์ข้อถัดไป (ข้อ **ประกาศซ้ำ**)

---

## Portfolio (สำหรับ registry.csv)

- **title:** ระบบจัดการซุ้มงานสายสัมพันธ์ (Sai Samphan Booth System)
- **lens:** systems
- **pitch:** ระบบคิว + order + จอแสดงผล realtime สำหรับซุ้มงานโรงเรียน 3 ซุ้ม ใช้งานจริงแบบ offline-first
- **problem:** ซุ้มงานโรงเรียนคิวชนกัน ลูกค้าไม่รู้ว่าถึงคิวตัวเองเมื่อไหร่ และยอดเงินสรุปไม่ตรง
- **outcome:** 129 automated tests, PWA offline-first, 3 ซุ้มทำงานพร้อมกันแบบ realtime
